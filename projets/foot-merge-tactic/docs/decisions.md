# Décisions validées — Foot Merge Tactic

Ce fichier ne contient que les décisions **[VALIDÉ]** en vigueur, prises par le concepteur et classées par thème. Les autres informations sont ailleurs :
- les versions remplacées : `historique-etat.md` ;
- les chiffres de réglage, presque tous en PROPOSITION : `propositions.md` ;
- ce qui reste à trancher : `questions-ouvertes.md`.

Quand une décision est validée, on l'ajoute ici avec sa date et les mots du concepteur. Ce qu'elle remplace part dans `historique-etat.md`. Ce fichier a été créé le 17/11/2026 à partir de l'ancien `CLAUDE.md` (442 lignes) et des décisions de l'audit du 16/11.

## 1. Univers et principes

- Le jeu en bref, le principe directeur et la priorité au moteur : voir `CLAUDE.md`.
- **Ordre de priorité** (17/11, accord du concepteur) : les décisions datées de ce fichier **priment sur le dossier de conception** du 11/11. Le dossier reste la référence pour tout ce qui n'a pas été décidé depuis, son §20 primant sur ses sections plus anciennes. En cas de doute, demander au concepteur.
- Vrais pays (cadre et nationalités), clubs fictifs, joueurs fictifs.
- Aucun élément sous licence : vrais joueurs, visages, noms de clubs, logos, maillots, marques de compétitions.
- Pas de divisions hebdomadaires à la Hattrick : on peut jouer un match à tout moment, sans calendrier ni attente.
- Priorités immédiates (11/11) : un moteur jouable ; pouvoir choisir les joueurs qui jouent et les placer ; un jeu équilibré ; un rendu intéressant. Les fusions viennent après le moteur.

## 2. Le match : format et durée

- Vue du dessus, terrain entier visible, 22 joueurs, ballon visible. Marqueurs simples au début, pas de 3D. Référence : le moteur 2D de Football Manager. Le joueur doit voir sa tactique.
- Le moteur simule toute la mi-temps. Il gère les déplacements, les passes, les appels, les duels, les interceptions, les tirs et les transitions.
- **Aucune action pendant le match** : on agit seulement pendant la préparation et à la mi-temps. Les tactiques se changent **avant le coup d'envoi et à la mi-temps seulement**. Pendant le jeu, pause comprise, elles sont grisées (13/11 au soir).
- **Durée (16/11)** : essayer une **mi-temps de 30 s à l'écran en gardant le rythme actuel (×3,5)**. Cela fait environ 105 s simulées au lieu de 180. Le chrono reste ramené à 45 minutes par une règle de trois. On jugera sur les chiffres (buts, matchs nuls). **La cible de 10 s est jugée trop courte.** Le concepteur a confirmé le 17/11 que c'est bien 30 s par mi-temps, soit environ 1 min de match. Le **montage des temps forts** devient la **solution de repli** : la construction passe très vite, la dernière passe et le tir reviennent presque à vitesse réelle.
- Préparation et mi-temps : plus de 10 s (durée exacte à tester). Les durées fixées :
  - tournoi en ligne : **5 minutes de préparation** (16/11, à réduire plus tard). **Le mercato entre deux journées et la mi-temps seront plus courts** (17/11) ; leurs durées exactes restent à fixer ;
  - 1 contre 1 : 10 minutes pour faire son équipe et une mi-temps d'1 minute (15/11).
- **Deux mi-temps** (12/11) :
  - **panneau de statistiques** à la mi-temps et à la fin : possession, tirs et tirs cadrés, passes réussies, tacles, fautes, corners, hors-jeu, arrêts ;
  - tactique modifiable à la mi-temps ;
  - l'adversaire engage la 2e mi-temps ;
  - dans le prototype : vitesse ×3,5 par défaut, soit environ 51 s par mi-temps à l'écran pour 180 s de jeu simulé, avec un chrono de 0' → 45' → 90'.
- **Changement de côté à la mi-temps** (14/11, « on ne change pas de côté, c'est un peu bizarre ») : en 2e mi-temps, le terrain est affiché retourné.
- **Mi-temps** (13/11) : on peut déplacer ses joueurs, faire des changements et voir la fatigue de chacun. Chaque joueur a **une note de match**. Dans le prototype, le panneau de mi-temps a un bouton « Changements, places, fatigue ». Il ouvre l'écran de préparation sans le mercato, avec une barre de forme et la note au-dessus de la tête de chaque joueur, puis on repart avec « 2e mi-temps ▶ ». Un remplaçant entre frais.
- **Buteurs** (13/11) : leur nom s'affiche à la mi-temps et en fin de match.
- **Comprendre pourquoi on gagne** (16/11) : le concepteur reconnaît le manque. Piste : le prompt B2 de l'audit, « le mot de l'adjoint ».

## 3. Postes, plateau et placement

- **Postes des joueurs** (12/11) : G, DC, DG/DD, MC, AG/AD, BU (buteur).
  - Sur le terrain, MDC, MOC et MD/MG ne sont que des repères indicatifs.
  - Un joueur peut aller sur toutes les cases de son poste : un MC sur tout le bloc du milieu.
  - **Le placement hors poste est refusé par l'interface.**
- **Une seule organisation pour l'instant** : chaque poste a **un seul rectangle de référence fixe** (position, largeur, profondeur). Les deux organisations, offensive et défensive (§6 du dossier), sont en pause : trop compliquées et trop longues à régler.
- Le rectangle n'est ni une case exclusive ni une barrière physique, et il ne bouge pas. C'est une zone de référence, pas une destination : le joueur y bouge selon le ballon, ses coéquipiers, les adversaires, les espaces, ses consignes et ses qualités.
- Les rectangles des postes peuvent se chevaucher, et plusieurs joueurs peuvent occuper une zone commune. Le moteur empêche quand même les joueurs de s'empiler. En revanche, **les grandes zones (défense, milieu, attaque) ne se chevauchent pas, ou à peine** : le concepteur est revenu sur « plus chevauchants », sinon « on ne comprend plus rien ».
- **Sous-zones** (positions possibles) de chaque rectangle :

  | Poste | Sous-zones |
  |---|---|
  | G | 1 (le gardien avancé est abandonné le 12/11) |
  | DC | 6, sur 2 lignes |
  | DD et DG | 2 ou 3 (le concepteur hésite) |
  | Milieu central | 9, sur 3 lignes (MDC, MC, MOC) |
  | AD et AG | 3 |
  | Attaquant | 6, sur 2 lignes |

  Ce découpage n'est exact qu'en carrés. En hexagones, le nombre de cases reste à valider.
- **Plateau en hexagones de couleur** (11/11), choisi après comparaison avec une variante en carrés, que le prototype garde :
  - toujours visible, sans chevauchement ;
  - rangées de 5 et de 4 cases en alternance, les rangées de 4 décalées d'une demi-case. Ce décalage donne la case de l'axe « à cheval » sur ses voisines ;
  - inspiration (capture envoyée par le concepteur) : le plateau de Merge Tactics, un quadrillage d'hexagones clair, « grossier mais intuitif et visuel », avec un compteur d'unités placées et les compteurs de traits sur le côté.
- **Les cases AG et AD sont des cases d'ailier**, à trois hauteurs : bas, milieu, haut (11/11). Il n'y a plus de « milieu de côté » ni de « milieu avancé » à part.
- **Placement sur un demi-terrain** (idée du concepteur) :
  - l'entraîneur place ses joueurs comme avant le coup d'envoi, dans son propre camp, chacun dans une sous-zone ;
  - les **règles de projection** du moteur transforment chaque position en position de match, en attaque et en défense. Leur correspondance exacte, une petite table de règles, se règle ensemble en regardant le prototype ;
  - le rectangle reste la zone de liberté dans laquelle le moteur fait bouger le joueur.
- **Plusieurs joueurs peuvent occuper le même poste**, dans la limite d'un maximum par poste (exemple donné : 3 DC, 1 AG).
- Aucune formation classique rigide n'est imposée. Pas de téléportation : les joueurs se déplacent progressivement.
- **Choix tactiques** (12/11) : le pressing, le contre-pressing, le jeu en contre, le jeu de passes courtes (tiki-taka), etc. Le moteur garde un réglage de base moyen, que ces choix modulent. La réussite des passes dépend des notes des joueurs.
- Plus tard, des **consignes d'équipe** (« volontés ») : plus défensive, plus offensive, jeu en contre… Pas maintenant.
- Priorité au moteur (11/11) : l'interface du placement n'était qu'une base. La vision du concepteur se précise depuis le 12/11 (§10 et §11).

## 4. Le jeu dans le moteur (concepteur, 12/11 et 14/11)

- **Moteur avec ballon réel jugé satisfaisant pour ce stade du prototype** (12/11).
- **Dans la surface adverse, le porteur tire toujours**, jamais de passe en retrait. **Seul face au but, il fonce et tire.**
- **Engagement** : chaque équipe est dans son camp, à sa place de coup d'envoi, pas regroupée au milieu (13/11). Le joueur qui engage **passe à un coéquipier**, à côté ou en retrait.
- **Coulisser et surnombre** : « il faut coulisser et apporter du surnombre des fois, DG/DD et MDC/MC/MOC, et encore plus s'ils sont hauts ».
- **Touche** : une passe, pas une conduite. **Six mètres** : au coin de la petite surface, du côté de la sortie, sans adversaire dans la surface.
- **Petite pause avant chaque remise en jeu** (touche, six mètres, coup franc, corner, engagement). Elle doit durer plus longtemps qu'au début (12/11 au soir) : l'annonce doit avoir disparu avant la reprise.
- **Son et annonce** à chaque arrêt de jeu : faute, penalty, hors-jeu, corner, six mètres, touche, but avec le score. **Pas d'annonce sur un arrêt du gardien**, car le jeu continue. Le sifflet ne donne qu'un coup.
- Le nombre de tirs ne gêne pas, le match étant très court. Il faut des arrêts du gardien et un jeu varié (côtés, centres, arrêts de jeu), pas seulement « on avance, on tire, on marque ».
- **Pas assez de buts** (12/11 au soir) : il faut une solution.
- **Trois défauts à corriger** (12/11 au soir, « ça prend forme mais pas totalement ») :
  - **ça court tout le temps** ;
  - **trop de va-et-vient** ;
  - **les actions finissent trop vite en tir**.

  Les corrections appliquées sont en PROPOSITION.
- **Charnière centrale** (14/11, « il faut une charnière très très proche ; on ne joue jamais avec des défenseurs centraux proches des latéraux ») : avec et sans le ballon, les défenseurs centraux restent près de l'axe et l'un de l'autre, et les latéraux tiennent la largeur.
- **Latéraux qui montent « des fois »** (14/11, « trop statiques en arrière, ils ne montent jamais »).
- **Ailiers qui repiquent au centre pour marquer** (14/11, « ils ont leur couloir, c'est trop robotisé »).

## 5. Joueurs : notes et caractéristiques (12/11 au soir et 13/11)

- **4 notes de 2 sous-notes chacune** :

  | Note | Sous-notes |
  |---|---|
  | **Vitesse** | accélération, vitesse de pointe |
  | **Technique** | passe ; dribble, qui comprend la protection du ballon |
  | **Tir** | précision, puissance |
  | **Physique** | **duel** (plutôt que tacle : tacles, interceptions, duels d'épaule, jeu aérien) ; endurance |
- Les notes doivent avoir **un vrai impact** dans le moteur. **La vitesse d'un joueur est super importante.**
- **L'endurance est un point clé** : elle fait ralentir les joueurs **au bout de 30 minutes d'affilée** et **au bout de 60 minutes au total** dans le match. L'effet est d'autant plus fort que l'endurance est mauvaise.
- **Gardien : 4 notes simples, sans sous-notes** (13/11 : « les 4 notes suffisent ») :
  - **Réflexes** : arrêter le tir, le bloquer plutôt que le repousser ;
  - **Placement** : fermer l'angle ;
  - **Sorties** : face-à-face, ballons dans le dos, centres ;
  - **Relance** : passes au pied, six mètres, dégagements.

  Pas d'endurance. Une fusion ajoute le même bonus à chaque note.
- **Fiche joueur à la Clash Royale** : une fiche jolie, avec le détail, pas une carte façon FC. Jugée bien le 13/11.
- **Visuels des joueurs** (13/11) :
  - **un buste différent par carte**, avec des **expressions variées** ; **que des hommes** ;
  - **pas de bandeau** (« c'est pas du tennis ») ;
  - **seul le gardien a des gants**. Il a la peau naturelle, le maillot de son pays, des gants et le drapeau : c'est ce qui l'identifie (13/11 midi) ;
  - **drapeau du pays sur le maillot**, posé au découpage et non dessiné par Kling, et sur la fiche.

## 6. Styles, pays et fusions

- Chaque joueur a **deux traits : sa nationalité et un style de jeu** (sa spécialité). Le **bonus de même nationalité** est cohérent avec la tradition de football du pays.
- **4 styles pour la première version** (12/11 ; 7, c'était trop) : **Récupérateur, Technicien, Rapide, Rempart**.
  - « Presseur » a été renommé **Récupérateur** le 12/11 : le concepteur n'aimait ni le terme ni le pictogramme, et le nom se confondait avec la tactique Pressing.
  - Les styles forment deux paires opposées : pressing contre conservation ; vitesse en contre contre défense qui recule vite.
  - Créateur, Finisseur et Combatif sont mis de côté.
- **Certains joueurs n'ont aucun style.** **Pas de styles propres au gardien.**
- **Le choix tactique de l'équipe est séparé des styles** : l'équipe a sa tactique en plus des styles de ses joueurs, et les styles ne la débloquent pas.
- **Styles et notes ne se définissent pas ensemble pour l'instant.**
- **Styles actifs en match** (13/11) : leur effet doit se voir.
- **Styles, pays et fusions** (14/11, le concepteur : « je valide tout ») :
  - **Style** : il **n'influe plus sur les notes de la carte**. Il donne un **bonus caché « pas négligeable »** (des points ajoutés dans le moteur seulement) **et un comportement**, **sans contrepartie** (« c'est un bonus, donc pas de contrepartie »).
  - **Paliers de style** : un bonus d'équipe à **3 joueurs** du même style, **plus fort à 5** et **bien visible**, avec un **bandeau** (« surtout avec 5 »). À 5, chaque style a une **action signature**. **On garde 5 joueurs par style** dans le catalogue (« ça va être compliqué, mais c'est ça qui est intéressant »).
  - **Pays** : à **5 joueurs du même pays** sur le terrain, un avantage, la **cohésion**, le même pour tous les pays. À **8**, la **tradition du pays** s'y ajoute :

    | Pays | Tradition |
    |---|---|
    | Espagne | garde le ballon |
    | Allemagne | récupère vite et fatigue moins |
    | Italie | défend en bloc compact |
    | Angleterre | gagne les duels et le jeu aérien |
    | France | accélère et dribble |
  - **Fusion** : au départ, elle apportait trop peu (« même fusionner 2 ou 3 fois, il apporte pas grand-chose »).
    - Elle **ne touche pas aux notes affichées** : pas de notes à 100, sinon les futurs niveaux de cartes n'ont plus d'intérêt.
    - Elle donne un **boost de match caché, le même pour toutes les cartes** : une vedette fusionnée reste au-dessus d'une petite carte fusionnée.
    - **Le joueur fusionné pèse plus dans le jeu** : on le cherche plus et il tente plus.
    - La fiche affiche une ligne « Fusion ★★ · boost de match ».
    - Refusé : « chaque fusion reprend un tiers de l'écart à 99 », qui avantageait les petites cartes.
- **Fusion, impact à augmenter** (16/11). Le barème reste à choisir (`propositions.md`, prompt B3).
- **Fusion de 2 copies du même joueur** : le joueur est amélioré et garde son identité. Un joueur déjà fusionné peut l'être à nouveau avec sa copie.
- Les fusions et les évolutions sont **temporaires**, remises à zéro à chaque tournoi. **Fusions possibles dès le départ, à partir des remplaçants.**
- **Hybrides** (fusion de deux joueurs différents) : **mis de côté le 16/11** (« je pense que c'est pas top »). Les règles d'avant sont dans `historique-etat.md`.

## 7. Cartes, catalogue, draft et mercato

- On reprend les idées de fusion du mode Merge Tactics de Clash Royale : achat de joueurs entre les matchs, fusion de copies identiques, bonus de traits.
- **Catalogue** (13/11) : **5 pays × 12 joueurs = 60 cartes**.
  - Chaque pays a 1 G (« crédible : un seul gardien français, un seul italien »), 2 DC, 1 DG, 1 DD, 3 MC, 1 AG, 1 AD et 2 BU.
  - Ce nombre a été choisi après une simulation de 50, 60 et 80 cartes. Avec 80, à peine plus d'une équipe sur deux voit un joueur monter au niveau 2 ; avec 60, 74 % des équipes.
- **Pays** (13/11 midi) : **France, Espagne, Angleterre, Allemagne, Italie** (« comme ça, ça fait européen »). Le Brésil et l'Argentine ont été retirés : « trop de bleus ». Dans le prototype, **les mêmes pays pour tout le monde** (13/11) ; pour la suite, voir le §8.
- **Styles dans le catalogue** (13/11) : chaque pays a **un joueur de chaque style** (4 sur 12, un tiers), **jamais le gardien**. Un même style tombe **à des postes différents** d'un pays à l'autre.
- Pour une nationalité donnée, **tout le monde a les mêmes joueurs**. Seuls les niveaux de cartes diffèrent.
- **Draft de début de tournoi** (13/11, sur le modèle du Draft d'Ultimate Team) :
  - on touche un poste, le jeu propose 4 ou 5 joueurs au hasard, on en choisit un. **Un toucher sur un joueur de l'offre le recrute**, sans bouton de validation ; ⓘ ouvre la fiche ;
  - le draft est **limité par un budget**, et les **prix de 1 à 5 sont bien visibles** ;
  - **seuls les 11 titulaires sont draftés** ;
  - **le banc se remplit par un premier mercato**, avant le premier match.
- **Budget : 50** (13/11, « il faut pouvoir faire des fusions » ; confirmé le 16/11). **Un seul budget pour le draft et le premier mercato** : ce qui n'est pas dépensé au draft sert au banc. L'économie du mercato se verra plus tard (16/11).
- **Après chaque match, un mercato.** Au mercato (13/11), **un toucher montre la fiche** (les notes), et **rester appuyé permet de déplacer la carte**.
- **Prix de vente** (14/11 midi, « son prix d'achat moins 1 ») : le prix payé, copies fusionnées comprises, moins 1. Il s'affiche sur la fiche d'un joueur de ton équipe. **Une carte à 1 pièce se revend 0** (« et 0 pour l'instant »).
- **Banc de 5 places.**

## 8. Collection, niveaux et pays au choix (à venir)

- Chaque **carte joueur a son propre niveau**, comme dans Clash Royale. Tous les joueurs ne commencent pas au même niveau.
- La carte change de couleur quand elle évolue en dehors des matchs : Bronze, Argent, Or. **En pause depuis le 12/11** : couleurs retirées de l'interface, à revoir plus tard.
- **Plus tard** (14/11, intention du concepteur) :
  - des **cartes de base** pour tous les joueurs ;
  - une **collection** comme dans Clash Royale : des **paquets** de cartes à **gagner ou acheter**, et des **niveaux** que chaque joueur fait monter précisément.

  D'où la règle des fusions : boost de match, pas de notes à 100.
- **Collection** (16/11) :
  - au départ, des cartes à 1, 2 et 3 pièces ;
  - les cartes à 4 pièces et plus **se débloquent** ;
  - une carte **garde son prix** et gagne des caractéristiques de base quand on cumule ses copies (seuils évoqués : 10, 100, 500).
- **Chacun son mercato** (16/11) : on ne voit que les cartes qu'on possède. Cela remplace la réserve commune.
- **Pays au choix** (16/11) : chaque joueur **choisit ses pays**, **5 pays par match**, et à terme **10 à 15 pays ou plus**. C'est le retour de l'idée de deck du 11/11 : les joueurs proposés pendant le tournoi viennent de ces pays.
- La connexion Google ou Apple viendra avec la collection (paquets, niveaux), pas avant (15/11).

## 9. Tournoi et adversaires

- **Tournoi en ligne** (16/11) : **en direct, complété par des IA**. L'idée des équipes enregistrées, jouées en différé, est abandonnée.
  - Pour l'instant : **4 équipes, 3 journées**, comme le championnat du prototype.
  - **5 minutes de préparation**, à réduire plus tard ; le mercato et la mi-temps seront plus courts (17/11).
- **Championnat de 4 équipes** (13/11 midi, « simuler tout un championnat de 4 équipes ») :
  - toi contre 3 ordinateurs (Tigres, Requins, Aigles) ;
  - les ordinateurs draftent et font leur mercato **avec le même budget** ;
  - **un mercato après chaque journée**.
- Format visé par le dossier (11/11) : **2 groupes de 4** (8 équipes), complétés par des équipes IA si besoin.
  - Puis demi-finales (1A contre 2B, 1B contre 2A) et finale, sans aller-retour.
  - 15 matchs au total ; chaque équipe en joue 3 à 5.
  - **Ce format reste l'objectif à terme** (confirmé le 17/11) ; à revoir s'il est trop long.
- Adversaires : des **entraîneurs IA** au départ, puis des humains **en direct** (16/11 : tournoi en ligne complété par des IA).
- **Si un joueur se déconnecte**, son équipe reste en l'état jusqu'à la fin du tournoi.

## 10. Interface : écran de préparation

**Maquette** (séance du 12/11) : https://claude.ai/artifact/67QRVRz7Fd6f8YWD9gHPq4. La page « V2 figurines » fait référence ; la V1, avec des ronds de couleur, est gardée sur sa page « V1 (de côté) ». Elle s'inspire de l'écran de Merge Tactics :
- en-tête avec le chrono et le classement du groupe, le prochain adversaire en rouge ;
- compteurs de pays et de styles à gauche ;
- plateau au centre, puis le banc, puis le mercato.

Les règles de l'écran :
- **Une couleur par pays**, sur le maillot des joueurs et dans les compteurs de pays. Le badge est plein ; un palier non atteint a un fond grisé.
  - Couleurs (13/11 midi) : France bleu marine, Espagne orange, **Angleterre rouge et blanc**, **Allemagne vert menthe** (« leur vert bizarre »), Italie bleu clair.
  - Les compteurs de styles sont en gris anthracite.
- **Plateau** :
  - cases de couleur à 30 % d'opacité avec un fin contour blanc ; noms de poste à 30 % ;
  - **fond : une vraie pelouse**. Le vert très clair #c4dbcd « ne fait pas terrain de foot » (12/11).
- **Gardien** : une seule case, en double losange (deux hexagones fusionnés), sous le DC central.
- **Joueurs en bustes de figurines** : style 3D « jouet en vinyle », original, sans pieds, sur un socle.
  - **La posture des bras change selon le style** : le rempart a les bras croisés, le créateur montre la direction, le combatif lève le poing, le technicien tient le ballon sur le doigt, le presseur se penche en avant, le rapide a les bras en course, le finisseur se désigne.
  - Le nom ne s'affiche qu'au toucher.
- **Fusions sur la préparation** : une aura qui épouse la silhouette et un anneau du socle, d'une couleur par niveau. Niveau 1 en bleu, 2 en or, 3 en violet avec des étincelles. Plus d'étoiles ni de crans.
- Écran compact, peu de noir, panneaux clairs.
- **L'écran tient sur une page de téléphone**, mercato visible sans défiler (13/11). Le 15/11 au matin, le concepteur : « les écrans sont encore trop hauts ». Depuis, **chaque écran tient sur la hauteur du téléphone** : le plateau de la préparation et le terrain du match rétrécissent selon la place.
- **Tactique d'équipe** (12/11) : une liste déroulante au-dessus du terrain, **une seule tactique à la fois** :
  - Équilibrée, par défaut (le réglage moyen du moteur) ;
  - Pressing, Gegenpressing, Contre, Tiki-taka.

  « Tactique » et le nom de la tactique choisie s'affichent à des tailles proches.
- **Styles en pictogrammes** dans les compteurs (12/11) :
  - Rempart : un bouclier ;
  - Récupérateur : un aimant vertical, pôles en haut, parce qu'il « aimante » le ballon. Il a été choisi après la main, le bras plié et le poing, jugés peu identifiables ;
  - Technicien : un ballon ;
  - Rapide : un éclair.
- **Style de chaque joueur visible** (12/11, « je ne sais pas quel joueur a quel style ») : une pastille du pictogramme sur le buste, sur le terrain, au banc et au mercato. Au toucher, « Nom · Style ».
- **Revue des écrans du 15/11** :
  - **plus d'onglets « Préparation / Match »** ;
  - **un gros bouton « Jouer le match » en haut** (« Prêt » en 1 contre 1) ;
  - plus d'encart « les ordinateurs draftent aussi » (« on imagine bien ») ;
  - plus de ligne « Les ordinateurs ont fait leur mercato » ;
  - écran inchangé en 1 contre 1 ;
  - **pendant le draft, le banc et le mercato sont déjà là, vides** (« sinon ça change après le draft »).

## 11. Interface : écran du match

- **Vue Action seule** (15/11, « tu laisses que Action ») : autour du ballon, **tous les joueurs passent en figurines, de façon fluide** (13/11), et les autres restent en pions. Le terrain entier reste visible.
- **Joueurs en figurines sur leur socle**, comme sur la préparation (12/11). Les pastilles rondes avec le visage ont été essayées puis abandonnées : « pas assez visibles », puis « le cercle avec les têtes n'est pas terrible ».
- **Maillots en match** (12/11, « les points et maillots adverses sont rouges, moi ils devraient être bleus ») :
  - **ton équipe en bleu**, **l'adversaire en rouge**, pour les pions comme pour les figurines ;
  - **tous les maillots d'une équipe sont identiques** : même couleur, sans bandes ;
  - **le même socle pour tous**, avec un anneau aux couleurs de l'équipe (12/11 au soir, « les cercles sous les joueurs doivent être de la même couleur que les maillots ») ;
  - le porteur garde un socle doré ;
  - les couleurs de pays restent sur l'écran de préparation.
- **Fusions visibles en match**, pour les deux équipes, autour des figurines et des pions (13/11, « la flamme n'apparaît plus ») :
  - **aux couleurs de l'équipe** : bleu pour toi, rouge pour l'adversaire. Le concepteur, le 14/11 : « la flamme de la couleur de l'équipe qui grossit » ; le bleu, l'or et le violet cachaient la couleur de l'équipe ;
  - **bien visibles** : « on ne les voyait plus trop » ;
  - avec **un crescendo net entre 1, 2 et 3** : « les halos trop visibles, les flammes pas assez ; il faut un crescendo entre 1, 2, 3 ».
- **Rendu choisi sur propositions visuelles** (14/11 après-midi ; page https://claude.ai/artifact/2CKAhmJXogvSfgW8VYV5Bg) :
  - **fusions « M2 »** (« ok pour M2 ») : un signe différent à chaque niveau, pour que le 1 se voie sans ressembler au 2 :
    - **niveau 1** : un contour lumineux qui suit la forme du joueur et quelques étincelles, sans feu ;
    - **niveau 2** : un feu réaliste derrière le joueur ;
    - **niveau 3** : un grand feu, des flammes sur les côtés et des braises. La flamme dessinée « faisait un peu enfantin » ;
  - **pictogrammes de style « P3 »** (« le P3 est pas mal ») : dans le pion, en blanc ; sur une plaque de la couleur du style posée sur le socle de la figurine. Ils remplacent la pastille sombre ;
  - le pictogramme du style est visible à côté de chaque joueur pendant tout le match (13/11).
- **Revue des écrans du 15/11** :
  - **pas de « Coup d'envoi »** : le match démarre directement ;
  - **pas de vitesse ni de zones** ; **le bouton du son reste** ;
  - **les tactiques des équipes montent en haut** ;
  - **plus rien sous le terrain** : ni interrupteurs, ni tableau de bord, ni note ;
  - **plus de phrase qui explique le jeu pendant le match** (« ça sert à rien ») ;
  - **noms des équipes plus gros** ;
  - **bandeau des bonus au milieu du terrain, avant l'engagement** (« ça cache le but ») ;
  - **sons à refaire, avec une ambiance qui varie suivant le ballon**.
- **Terrain de match plus joli** (14/11 matin) : « le fond du terrain pourrait être plus joli », « le terrain de jeu est un peu très simple ».
- **Le ballon** (12/11) : « le ballon n'est pas beau par rapport au reste ». Le rendu est en PROPOSITION.
- Reste à revoir par le concepteur : la mi-temps, la fin de match, la journée suivante.

## 12. Premier écran et modes

- **Premier écran : le choix du mode** (15/11). Deux modes :
  - **Championnat (test)**, comme dans le prototype : draft, mercato, 3 journées ;
  - **1 contre 1**.

  On peut changer de mode, avec le bouton ⌂.
- **En 1 contre 1** : **10 minutes** pour faire son équipe, un seul match, pas de mercato après (« ça répond à ta question sur le mercato »).

## 13. Jeu en ligne

- **1 contre 1 entre amis par un lien**, envoyé sur WhatsApp :
  - il s'ouvre dans le navigateur de n'importe quel téléphone ou PC, **sans compte Claude** pour l'ami (« ça c'est pas possible pour tester ») ;
  - **le match est calculé sur un serveur** et envoyé aux deux écrans.
- **Règles du 15/11 midi** :
  - **tirage du draft différent pour chacun** ;
  - **mi-temps en ligne d'1 minute** pour les changements. La reprise part plus tôt si les deux joueurs sont prêts ;
  - au bout des 10 minutes, une équipe incomplète est complétée automatiquement. Annoncé au concepteur, sans objection.
- **Hébergement** :
  - un **dépôt GitHub séparé, `FootMergTactic`**, créé le 15/11 par le concepteur ; public, avec GitHub Pages sur `main` à la racine ;
  - **le code reste dans `Claude`**, **le site est seulement dans `FootMergTactic`**, rien dans `Claude` (« tu vas pas mélanger de projet, fais-moi un truc propre, bien séparé »). Le concepteur a préféré ce dépôt séparé à un dossier `Claude/foot` (15/11) ;
  - Claude ne peut ni créer un dépôt ni régler Pages : c'est au concepteur. L'application GitHub de Claude a accès à tous les dépôts du compte (« All repositories »).
- **Serveur** : un projet Supabase dédié au jeu (15/11, choix du concepteur) : `foot-merge-tactic`, id `jcbqeoyygozmtixlorvf`, région Paris, offre gratuite.

## 14. Technique et code

- **Prototype en version web** : TypeScript, page autonome ouverte d'un lien sur le téléphone. Godot n'est installable ni dans l'environnement de Claude ni sur le PC de travail du concepteur. L'outil final se choisira quand le moteur convaincra : rester en web et en faire une application, ou passer à Godot.
- **Audit du code du 16/11** : les constats sont **gardés tels quels**, et rien n'a été changé dans le code. Détail et prompts A1 à A4 dans le fichier `claude/audit-1-code-actuel.md` du projet claude.ai. Les constats, par ordre d'importance :
  1. `src/sim/ballon.ts` (1 605 lignes, `decider()` de 277 lignes) est à découper (découpé le 17/11 en dix fichiers, `src/sim/ballon.ts` et `src/sim/ballon/`, sans changer un seul match : pull request n° 14, fusionnée le 17/11) ;
  2. `src/ui/ecranMatch.ts` (1 397 lignes) et `demarrer()` de `main.ts` (246 lignes) aussi ; aucun test sur les écrans ;
  3. rien ne nettoie le serveur : chaque partie laisse 2 films d'environ 0,9 Mo, et la table d'essai `parties_essai_15_11` est vide ;
  4. le serveur ne vérifie pas que les cartes viennent des offres du draft, ni le nombre de copies de la réserve ;
  5. aucune limite sur la création de parties ;
  6. le feu des fusions, un filtre SVG de turbulence, et les 22 figurines en SVG n'ont jamais été mesurés sur un téléphone d'entrée de gamme (mesuré le 17/11 dans Chrome au processeur ralenti : c'est le feu qui coûte, voir `journal.md`) ;
  7. `CLAUDE.md` trop long et copié à la main à deux endroits (traité le 17/11) ;
  8. `dist/index.html` (3,2 Mo) était enregistré dans le dépôt à chaque version. Retiré le 17/11 avec l'accord du concepteur : la page est refabriquée par `bun run construire` avant chaque publication ;
  9. la 2e mi-temps recalcule la 1re sur le serveur.
- **Serveur en ligne : A3 mis de côté** (17/11). Après la proposition d'un ménage à 24 h, le concepteur : « le but à terme c'est quand même d'avoir un peu l'historique de ce qui s'est passé », « on met tout de côté ». On ne purge rien et on ne déploie rien ; **l'historique des parties est à garder**. Le code (ménage, limite de créations, tests) reste sur la branche `a3-serveur` (pull request n° 15, fermée sans fusion) ; le plan pour y revenir est dans `questions-ouvertes.md`.

## 15. Feuille de route et laboratoire de tests (dossier, §16)

Feuille de route :
1. **Terrain et placement** : un rectangle par poste, sous-zones, plusieurs joueurs par poste, chevauchements, choix des joueurs qui jouent, 22 marqueurs. Pas encore de ballon.
2. **Déplacements et transitions** : pas de téléportation, distances entre coéquipiers, évitement des collisions, mouvement progressif du bloc selon la possession.
3. **Ballon et actions** : passes courtes et longues, contrôle, interception, duel, tir, gardien, changement de possession. *Fait le 12/11, avec une partie de l'étape 4 : pressing, contre-pressing, marquage, jeu sur les côtés.*
4. **Intelligence collective** : appels, démarquages, soutien, couverture, pressing, contre-pressing, largeur, profondeur, replacement, occupation de la surface.
5. **Attributs et équilibrage** : un attribut ou un petit groupe à la fois, avec effet expliqué et tests comparatifs. Puis les bonus de styles et de nationalité.
6. **Match complet** : durée à l'écran (essai à 30 s décidé le 16/11, montage des temps forts en repli), préparation et mi-temps.
7. **Présentation mobile et boucle de jeu** (cartes, deck, mercato, fusions, entraîneur IA, tournoi, progression, animations, sons) : seulement quand le moteur convainc. Le direct entre humains vient ensuite.

Laboratoire de tests, construit en même temps que le moteur :
- **Tests techniques** : limites du terrain, pas de téléportation, état du ballon valide, possessions, passes et tirs résolus, fin de match, durée, déclenchement des transitions.
- **Tests tactiques** : équipes de même qualité avec des organisations différentes (bloc haut contre bloc bas, resserré contre large, axe contre ailes, 3 DC contre 2 DC, etc.).
- **Tests d'équilibrage** : beaucoup de matchs, avec résultats, buts, tirs, tirs cadrés, occasions, passes, pertes de balle, interceptions, récupérations, possession, temps par tiers, temps de transition, efficacité du pressing, actions incohérentes.
- Aucun objectif de pourcentage de victoire avant les premiers résultats. Les plages cibles sont définies ensuite et validées par le concepteur.
