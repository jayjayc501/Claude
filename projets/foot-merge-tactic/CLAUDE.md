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
- **Postes des joueurs (12/11)** : G, DC, DG/DD, MC, AG/AD, BU (buteur). Sur le terrain, MDC, MOC et MD/MG ne sont que des repères indicatifs. Un joueur peut aller sur toutes les cases de son poste (un MC sur tout le bloc du milieu). **Le placement hors poste est refusé par l'interface** (12/11 ; remplace « placé hors de son poste, il est moins efficace mais reste utilisable »). Ouvert : 1 ou 2 postes par joueur ; un DG peut-il jouer DD (et un AG, AD) ?
- **Pour l'instant, une seule organisation** : chaque poste a **un seul rectangle de référence fixe** (position, largeur, profondeur). Les deux organisations offensive et défensive (§6 du dossier) sont en pause : trop compliquées et trop longues à régler.
- Le rectangle n'est ni une case exclusive ni une barrière physique. Les rectangles ne bougent pas. **Les grandes zones (défense, milieu, attaque) ne se chevauchent pas, ou à peine** (le concepteur revient sur « plus chevauchants » : sinon on ne comprend plus rien).
- **Chaque rectangle est découpé en sous-zones** (positions possibles) : G 1 (le gardien avancé est abandonné le 12/11) ; DC 6 sur 2 lignes ; DD et DG 2 ou 3 (le concepteur hésite) ; **milieu central 9 sur 3 lignes** (MDC, MC, MOC) ; AD et AG 3 ; **attaquant 6 sur 2 lignes**.
- **Défenseurs centraux, milieu, attaque : 3 cases par ligne, et la case de l'axe est à cheval sur celle de gauche et celle de droite** (colonnes qui se chevauchent). Appliqué dans le prototype le 11/11, puis remplacé le même jour par la proposition de plateau unique (hexagones ou carrés, voir « Propositions »), à la demande du concepteur ; en hexagones, le « à cheval » vient des rangées décalées.
- **Inspiration visuelle** (capture envoyée par le concepteur) : le plateau de Merge Tactics, un quadrillage d'hexagones clair, toujours visible, « grossier mais intuitif et visuel », avec un compteur d'unités placées et les compteurs de traits sur le côté.
- **Plateau en hexagones de couleur** (11/11, choisi après comparaison avec une variante en carrés, gardée dans le prototype) : toujours visible, sans chevauchement, rangées de 5 et 4 cases en alternance, les rangées de 4 décalées d'une demi-case. Nombre de cases par poste en hexagones : voir « Propositions » (à valider).
- **Les cases AG et AD sont des cases d'ailier**, à trois hauteurs (bas, milieu, haut) (11/11). Plus de « milieu de côté » ni de « milieu avancé » à part.
- **Priorité au moteur** (11/11) : l'interface actuelle n'est qu'une base (les positions), loin de la vision finale du concepteur, qu'il décrira plus tard. 12/11 : vision en cours de définition, voir « Interface (séance du 12/11) ».
- **Placement sur un demi-terrain** (idée du concepteur) : l'entraîneur place ses joueurs comme avant le coup d'envoi, dans son propre camp. Les **règles de projection** du moteur transforment ensuite chaque position en position de match, en attaque et en défense. La correspondance exacte (une petite table de règles) se règle ensemble en regardant le prototype.
- L'entraîneur place chaque joueur dans une sous-zone ; le rectangle reste la zone de liberté dans laquelle le moteur fait bouger le joueur.
- **Plusieurs joueurs peuvent occuper le même poste**, dans la limite d'un maximum par poste (exemple donné : 3 DC, 1 AG).
- Les rectangles peuvent **se chevaucher** et plusieurs joueurs peuvent occuper une zone commune. Le moteur doit quand même empêcher les joueurs de s'empiler.
- Aucune formation classique rigide imposée.
- Pas de téléportation : les joueurs se déplacent progressivement.
- Le rectangle est une zone de référence, pas une destination : le joueur bouge selon le ballon, ses coéquipiers, les adversaires, les espaces, ses consignes et ses qualités.
- Plus tard, des **consignes d'équipe** (« volontés ») : plus défensive, plus offensive, jeu en contre, etc. Pas maintenant.
- **Pressing, contre-pressing, jeu en contre, jeu de passes courtes (tiki-taka)… seront des choix tactiques** (12/11). Le moteur garde un réglage de base moyen ; les consignes le moduleront. La réussite des passes dépendra des notes des joueurs.

### Jeu avec ballon (concepteur, 12/11)
- **Moteur avec ballon réel jugé satisfaisant pour ce stade du prototype** (12/11). Prochaine étape : interface, puis concept des cartes et des notes, dans une nouvelle conversation.
- Dans la surface adverse, le porteur **tire toujours** (jamais de passe en retrait). Seul face au but, il **fonce et tire**.
- **Engagement** : chaque équipe dans son camp ; le joueur qui engage **passe à un coéquipier** (à côté ou en retrait).
- **Touche** : une passe, pas une conduite. **Six mètres** : au coin de la petite surface, du côté de la sortie, sans adversaire dans la surface.
- **Petite pause** avant chaque remise en jeu (touche, six mètres, coup franc, corner, engagement).
- **Son et annonce** à chaque arrêt de jeu (faute, penalty, hors-jeu, corner, six mètres, touche, but avec le score) ; **pas d'annonce sur un arrêt du gardien** (le jeu continue). Sifflet d'un seul coup.
- Le nombre de tirs ne gêne pas (match très court) ; il faut des arrêts du gardien et un jeu varié (côtés, centres, arrêts de jeu), pas seulement « on avance, on tire, on marque ».

### Interface (séance du 12/11)
Maquette de l'écran de préparation sur claude.ai : https://claude.ai/artifact/67QRVRz7Fd6f8YWD9gHPq4 (page « V2 figurines » ; la V1, avec des ronds de couleur, est gardée sur sa page « V1 (de côté) »). Inspirée de l'écran de Merge Tactics : en-tête avec chrono et classement du groupe (prochain adversaire en rouge), compteurs de pays et de styles à gauche, plateau au centre, banc, puis mercato.
- **Une couleur par pays** sur le maillot des joueurs et dans les compteurs de pays (badge plein ; palier non atteint = fond grisé). Maquette : France bleu marine, Espagne orange, Brésil vert, Italie bleu clair. Compteurs de styles en gris anthracite.
- **Banc de 5 places.**
- **Plateau** : cases de couleur à 30 % d'opacité avec fin contour blanc, noms de poste à 30 %, terrain vert très clair (#c4dbcd).
- **Gardien** : une seule case, en double losange (deux hexagones fusionnés), sous le DC central.
- **Joueurs en bustes de figurines** (style 3D « jouet en vinyle », original), sans pieds, sur un socle. **Posture des bras différente selon le style** (rempart bras croisés, créateur qui montre la direction, combatif poing levé, technicien ballon sur le doigt, presseur penché en avant, rapide bras en course, finisseur qui se désigne). Nom affiché seulement au toucher.
- **Fusions** : aura qui épouse la silhouette et anneau du socle, d'une couleur par niveau : 1 = bleu, 2 = or, 3 = violet avec étincelles. Plus d'étoiles ni de crans.
- Écran compact, peu de noir (panneaux clairs).
- [PROPOSITION, gardée dans la maquette] Mercato de 6 joueurs sur une rangée, budget dans le titre du mercato ; poste écrit sous le buste ; revente en glissant le joueur vers le mercato.
- Les images de joueurs de la maquette viennent de Kling (environ 14 crédits) : ce sont des références, pas les visuels du jeu. Elles contiennent de petits logos et numéros à retirer.

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
- Chaque **carte joueur a son propre niveau**, comme dans Clash Royale. La **carte change de couleur** quand elle évolue en dehors des matchs : Bronze, Argent, Or sont les couleurs du niveau. Tous les joueurs ne commencent pas au même niveau. **En pause depuis le 12/11** : couleurs Bronze/Argent/Or retirées de l'interface, à revoir plus tard.
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
- (Remplacé le 12/11 : hors poste refusé ; MDC, MOC, MD/MG sont des repères dans les blocs MC et ailiers.)
- Latéraux (DD, DG) : 3 cases en profondeur en attendant la décision (2 ou 3).
- Un seul joueur par case.
- Les données décrivent les postes (maximum de joueurs, ligne défensive) et chaque plateau rangée par rangée ; les rectangles des postes sont déduits des cases.
- **Règles de projection, version 4** (12/11, d'après `docs/reference-football.md` §9 ; chiffres dans `reglages.json`) :
  - **sans le ballon, défense par lignes** : chaque poste rejoint sa ligne (gardien ; défense : DC, DG, DD ; milieu : milieu central et côtés ; attaque : attaquant). La ligne défensive se tient 18 m derrière le ballon, entre 12 et 38 m de son but (bloc médian), et **s'y rend à vitesse limitée** (recule de 3 m/s, remonte de 5 m/s au plus ; recule à 7 m/s si le ballon arrive à moins de 8 m devant elle) ; milieu 11 m devant, attaque 23 m devant. Le placement compte en profondeur à 45 % en défense, 70 % au milieu et en attaque (12/11, « zones trop étroites sur la hauteur ») : **un latéral placé haut revient dans la ligne de défense**, mais les hauteurs de placement restent lisibles. Chaque ligne de 3 joueurs ou plus tient entre 39 et 44 m de large, ordre gauche-droite gardé, 6 m au moins entre voisins, coulissement vers le ballon (45 %) ;
  - **avec le ballon** (refait le 11/11 après « gros problème de placement durant le match ») : l'équipe s'étire entre une **ligne arrière à 15 m derrière le ballon** (entre 15 et 55 m de son but) et une **ligne avant 1 m en deçà de la ligne que tient l'adversaire** (hors-jeu) ; 30 à 50 m de long ; **entre les deux, l'ordre de profondeur du placement est gardé** (la case la plus basse du plateau donne la ligne arrière, la plus haute la ligne avant) ; l'équipe s'écarte en largeur ;
  - **aucune cible ne dépend de la position du moment d'un autre joueur**, seulement du ballon, du placement et des hauteurs de ligne tenues par les équipes (fonction du ballon et du temps) ; sinon boucle : la ligne adverse s'enfonçait dans sa surface ;
  - **transitions** (12/11, après « l'équipe doit rester groupée pendant les transitions » et « mouvements robots, synchronisés ») : chaque joueur réagit à son tour (0,2 s + 0,008 s par mètre du ballon + 0 à 0,35 s), les plus proches du ballon d'abord ; puis sprint de transition à 8 m/s pendant 5 s au plus, sinon course à 7 m/s, avec ± 6 % de vitesse et d'accélération selon le joueur ; à la perte du ballon, la ligne défensive part de la hauteur des défenseurs en attaque et recule pas à pas pendant que le milieu revient ; les attaquants qui récupèrent visent la ligne que l'adversaire tient vraiment ; un joueur placé haut revient toujours en retard (contrepartie naturelle) ;
  - **perception** : chacun voit le ballon avec un petit retard (0,1 à 0,3 s selon le joueur, + 0,004 s par mètre) ; le bloc ne démarre plus d'un seul coup ;
  - **évitement anticipé** : 3 m au minimum entre coéquipiers, 2,5 m entre adversaires.
- **Ballon et actions** (12/11, `src/sim/ballon.ts`, chiffres dans `reglages.json` → `ballon`) :
  - ballon porté ou libre (frottement), possession au dernier qui l'a touché ; ballon aérien (centres, dégagements) intouchable pendant 80 % du vol ;
  - porteur : décision toutes les 0,6 à 1,2 s ; tir (surface, seul devant, parfois de loin), centre depuis l'aile, dribble face à un adversaire proche, passe notée (progression, espace, distance, voie libre, largeur), passe dans l'espace vers un coéquipier lancé, rotation du ballon si l'avant est bouché, dégagement long sous pression près de son but, protection du ballon ;
  - défense : un presse, un couvre ; contre-pressing 4 s après une perte (3 joueurs) ; près de son but, marquage côté but et recul rapide de la ligne ; contres (ballon rapide dévié) ; tacle, faute 4 fois sur 10 ;
  - gardien : plonge vers le point de passage du tir, arrête selon l'écart et la distance, repousse parfois en corner ;
  - règles : hors-jeu au départ de la passe, faute → coup franc (adversaires à 9,15 m) ou penalty, corner, six mètres, touche, but et engagement ;
  - repères mesurés (12 matchs de 3 min) : 1,25 but, 9 tirs, 4 arrêts, 2 fautes, 2 à 3 touches par match ; 77 % de passes réussies ; 5,8 changements de camp par minute (vrai football : 2 à 3).
- **Plateau de placement** (hexagones validés le 11/11 ; carrés gardés en variante) : couleurs jaune gardien, bleu défense, violet milieu, rouge attaque ; couloirs des côtés plus clairs ; rôle écrit dans la case.
  - **Hexagones (par défaut)** : G 1 (double losange, 12/11), DC 5 (3 + 2), DG 3, DD 3, milieu 8 (MDC 3, MC 2, MOC 3), ailiers 3 + 3, attaque 5 (2 + 3). **Nombre de cases à valider** : le découpage validé (DC 6, milieu 9, attaque 6) n'est exact qu'en carrés.
  - **Carrés** : 5 cases par rangée, exactement le découpage validé.
  - Gardien : une case en double losange sous le DC central (12/11). Coins hauts sans case. En changeant de forme, chaque joueur garde son poste, sur la case la plus proche.
- Maximums provisoires (non validés) : DG 1, DD 1, milieu 4, AD 1, attaquant 3 (validés en exemple : 3 DC, 1 AG ; le gardien : 1).
- **Écran de placement sur une page** (11/11) : plateau + banc en ronds dessous. Tout au glisser-déposer : sur une case libre, sur un joueur (échange, ou entrée d'un remplaçant), sur le banc (sortie). Plateau toujours visible ; choix hexagones / carrés en haut à droite. Plus de liste ni de boutons de poste.
- **Écran de match sur une page** : coup d'envoi, pause, vitesse, son et zones au-dessus du terrain ; score, possession et dernier événement dessous ; annonces sur le terrain et sons (Web Audio, `src/ui/son.ts`).

Boucle de tournoi (transposition de Merge Tactics) :
- Budget de mercato gagné à chaque match (l'équivalent de l'élixir) ; mercato de 3 joueurs, renouvelés après chaque achat ; deux copies identiques fusionnent automatiquement ; joueurs achetés sur le banc des remplaçants, revente possible.
- L'hybride reste une fusion volontaire, et la signature du jeu (Merge Tactics ne fusionne que des troupes identiques).
- 11 joueurs dès le premier match : le mercato sert à remplacer et à fusionner, pas à compléter l'équipe.
- Tactique réglée avant le tournoi, sans chrono ; en préparation et à la mi-temps, seulement des ajustements rapides (glisser un joueur sur un autre pour fusionner, sur une sous-zone pour le placer).
- (12/11) Couleur de niveau en pause ; les fusions se voient par l'aura (bleu, or, violet avec étincelles), plus par des étoiles.

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
- **Placement** : nombre de cases en hexagones (DC 5, milieu 8, attaque 5) ; DD et DG à 2 ou 3 cases (3 dans le prototype) ; maximum de joueurs par poste ; découpage exact du plateau ; chiffres des règles de projection (à régler ensemble sur le prototype).
- Consignes d'équipe (plus défensive, plus offensive, en contre…) : plus tard.
- Égalités : classement des groupes, matchs nuls en demi-finale et en finale.
- Temps de football simulé par mi-temps, nombre de temps forts montrés, durées exactes de la préparation et de la mi-temps.
- Taille de l'effectif de chaque pays (fréquence des copies, donc des fusions) ; budget, prix et revente au mercato.
- Liste finale des styles et de leurs effets ; paliers.
- Couleurs au-delà de l'Or ; écarts de niveau entre adversaires (appariement ou plafond) ; ressources pour faire évoluer les cartes.
- Moteur technique final ; dimensions du terrain ; coordonnées et tailles des rectangles ; liste finale des postes.
- Comportement exact de chaque poste ; liste des attributs ; liste des consignes tactiques.
- Temps de réaction et de perception, vitesse de recul de la ligne (réglables, à tester ; l'ancien délai unique de 0,5 s est remplacé par des réactions individuelles le 12/11).
- Hors-jeu, fautes, touches, corners, coups francs : en place dans le prototype (12/11), règles fines ouvertes (cartons, coups francs directs, centres sur coup franc). Nombre de remplaçants ; fatigue.
- Poids chiffré de la qualité, de la tactique et du hasard.
- Règle de nom de l'hybride ; interface et graphismes définitifs ; temps entre deux matchs.
- **Nom définitif du jeu** et **modèle économique**.
- **Interface (12/11)** : un DG peut-il jouer DD (et un AG, AD) ; 1 ou 2 postes par joueur ; nombre maximal de fusions (3 dans la maquette) ; taille du mercato (6 dans la maquette) ; production des visuels des joueurs (pièces assemblées, modèles 3D ou illustrateur) ; lisibilité des bustes sur un vrai téléphone ; figurines aussi pendant le match (plus tard).

## Points de vigilance (analyse Claude, non validés)

Détail des anciens points dans `docs/historique-etat.md`. Encore actifs :
- Matchs courts = beaucoup de hasard : le temps simulé par mi-temps est le curseur, à mesurer.
- Nom « Foot Merge Tactic » trop proche de « Merge Tactics » : à changer avant toute publication.
- Fusion « meilleure valeur de chaque statistique » entre postes opposés : quels postes pour l'hybride ?
- Changements de camp encore trop fréquents (5,8 par minute contre 2 à 3) : à revoir avec les notes des joueurs.
- Appariement ou plafond de niveau en tournoi (équité).
- Visuels des joueurs : une image générée par joueur ne tiendra pas sur des centaines de joueurs (styles qui dérivent). Pour le jeu final, prévoir un jeu de pièces (corps, têtes, cheveux) avec maillot recoloré selon le pays, ou des modèles 3D, ou un illustrateur. Aucun logo, numéro ni maillot qui rappelle un vrai maillot.

## Notes techniques (propositions)

- Prototype dans `prototype/` : TypeScript, sans dépendance. `bun test` lance les tests, `bun run construire` fabrique `dist/index.html` (page autonome, code et données inclus). Voir le `README.md` du projet.
- Simulation en pas de temps fixe (1/30 s), avec son propre générateur aléatoire à graine (`src/sim/rng.ts`). Le code de `src/sim/` ne dépend pas de l'affichage : il tourne dans les tests sans navigateur.
- Coordonnées **normalisées** dans le repère de chaque équipe (x de 0 à 1 sur la largeur, y de 0, sa ligne de but, à 1, la ligne adverse). L'équipe adverse utilise la symétrie. Les cases se déduisent du plateau choisi (hexagones ou carrés), décrit rangée par rangée dans `postes.json`.
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
15. **Prototype en phase de réglages grossiers : commit direct sur `main`**, sans demande de fusion (accord du concepteur, 11/11/2026). Toujours lancer les tests, vérifier au format téléphone et noter le changement dans `journal.md`.

## Feuille de route

1. **Terrain et placement** : un rectangle par poste, sous-zones, plusieurs joueurs par poste, chevauchements, choix des joueurs qui jouent, 22 marqueurs. Pas encore de ballon.
2. **Déplacements et transitions** : pas de téléportation, distances entre coéquipiers, évitement des collisions, mouvement progressif du bloc selon la possession.
3. **Ballon et actions** : passes courtes et longues, contrôle, interception, duel, tir, gardien, changement de possession. *(Fait le 12/11, avec une partie de l'étape 4 : pressing, contre-pressing, marquage, jeu sur les côtés.)*
4. **Intelligence collective** : appels, démarquages, soutien, couverture, pressing, contre-pressing, largeur, profondeur, replacement, occupation de la surface.
5. **Attributs et équilibrage** : un attribut ou un petit groupe à la fois, avec effet expliqué et tests comparatifs. Puis les bonus de styles et de nationalité.
6. **Match complet** : montage accéléré à vitesse variable des temps forts, préparation et mi-temps.
7. **Présentation mobile et boucle de jeu** (cartes, deck, mercato, fusions, entraîneur IA, tournoi, progression, animations, sons) : seulement quand le moteur convainc. Le direct entre humains vient ensuite.

Laboratoire de tests, construit en même temps que le moteur :
- Tests techniques : limites du terrain, pas de téléportation, état du ballon valide, possessions, passes et tirs résolus, fin de match, durée, déclenchement des transitions.
- Tests tactiques : équipes de même qualité avec des organisations différentes (bloc haut contre bloc bas, resserré contre large, axe contre ailes, 3 DC contre 2 DC, etc.).
- Tests d'équilibrage : beaucoup de matchs, avec résultats, buts, tirs, tirs cadrés, occasions, passes, pertes de balle, interceptions, récupérations, possession, temps par tiers, temps de transition, efficacité du pressing, actions incohérentes.
- Aucun objectif de pourcentage de victoire avant les premiers résultats. Les plages cibles sont définies ensuite et validées par le concepteur.

## État

Historique détaillé : `journal.md` (par jour) et `docs/historique-etat.md` (anciennes entrées).

- **Prototype 1** (web, `prototype/`, 87 tests verts) : plateau en hexagones, projection v4 (lignes, transitions, réactions individuelles), **ballon réel** (passes, tirs, centres, dribbles, interceptions, contres, pressing et contre-pressing, gardien qui plonge, hors-jeu, fautes, penalty, corners, touches, six mètres, engagement), sons et annonces. Lien : https://claude.ai/artifact/B86yGS9jR47LwubdEiL5EN
- **12/11 : moteur jugé satisfaisant pour ce stade** par le concepteur. **Prochaine conversation : l'interface, puis le concept des cartes et des notes des joueurs** (lot C : la réussite des passes, des tirs, des arrêts dépendra des notes).
- Limites connues du moteur : encore trop de changements de camp ; presque pas de hors-jeu ; aucune qualité individuelle (tous les joueurs passent et tirent pareil) ; pas d'appels ni de démarquages organisés ; pas de consignes tactiques (pressing, contre, tiki-taka : choix tactiques futurs).
- Règle de séance (concepteur, 12/11) : **économiser les tokens** : peu de lectures, peu de tests et de captures, le concepteur valide lui-même ; mettre à jour le projet claude.ai seulement aux grandes étapes ; réponses courtes ; une conversation par sujet.
- **12/11 (interface)** : maquette de l'écran de préparation (bustes, couleurs par pays, fusions en couleurs) : https://claude.ai/artifact/67QRVRz7Fd6f8YWD9gHPq4. Décisions dans « Interface (séance du 12/11) ». Prochaine étape : concept des cartes et des notes (fiche joueur avec buste, pays, style, notes), puis intégrer l'écran dans le prototype.
