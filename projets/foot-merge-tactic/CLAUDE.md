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
  - PROPOSITION (12/11, après « les engagements sont nuls : une passe en arrière à personne ») : un coéquipier se place à 4 m du ballon ; les adversaires restent dans leur moitié, hors du rond ; on attend partenaire en place et rond vide (6 s au plus), puis passe au partenaire (85 %) ou en retrait. Ballon gardé 6 s après l'engagement : 27/40 (avant 11/40).
- **Coulisser et surnombre** (concepteur, 12/11) : « il faut coulisser et apporter du surnombre des fois, DG/DD et MDC/MC/MOC, et encore plus s'ils sont hauts ». PROPOSITION : en attaque, le bloc glisse vers le côté du ballon (latéral et ailier opposés moins, pour la largeur) ; DG/DD et milieux proches du ballon montent jusqu'à 12 m de plus quand le ballon est haut (dès 40 % du terrain, plein à 75 %) ; limite : au moins 4 joueurs de champ restent derrière le ballon. **Respiration** : petites oscillations de 2 m autour de la place en attaque, contre l'effet robot.
- **Touche** : une passe, pas une conduite. **Six mètres** : au coin de la petite surface, du côté de la sortie, sans adversaire dans la surface.
- **Petite pause** avant chaque remise en jeu (touche, six mètres, coup franc, corner, engagement).
- **Son et annonce** à chaque arrêt de jeu (faute, penalty, hors-jeu, corner, six mètres, touche, but avec le score) ; **pas d'annonce sur un arrêt du gardien** (le jeu continue). Sifflet d'un seul coup.
- Le nombre de tirs ne gêne pas (match très court) ; il faut des arrêts du gardien et un jeu varié (côtés, centres, arrêts de jeu), pas seulement « on avance, on tire, on marque ».
- **Pas assez de buts** (concepteur, 12/11 au soir) : il faut une solution. **Pause plus longue avant de reprendre** après une touche, un coup franc… : l'annonce doit avoir disparu.
- **Trois défauts à corriger** (concepteur, 12/11 au soir, « ça prend forme mais pas totalement ») : **ça court tout le temps**, **trop de va-et-vient**, **les actions finissent trop vite en tir**. PROPOSITION appliquée le 12/11 (détail et mesures dans `journal.md`) : avant bouché, le porteur temporise et fait circuler au lieu de foncer dans le bloc ; passes dans la surface seulement vers un joueur libre ; « seul face au but » = personne entre lui et le but ; moins de tacles et de tirs de loin ; rythme un peu plus posé ; on trotte loin de l'action. Résultat : 5,4 changements de camp par minute (6,7), possessions de 10,6 s et 4 passes (8,7 s et 2,5), 27 % des possessions finissent en tir (35 %), 5,5 tirs par match (8,6), 3,9 m/s de moyenne (4,3).

### Interface (séance du 12/11)
Maquette de l'écran de préparation sur claude.ai : https://claude.ai/artifact/67QRVRz7Fd6f8YWD9gHPq4 (page « V2 figurines » ; la V1, avec des ronds de couleur, est gardée sur sa page « V1 (de côté) »). Inspirée de l'écran de Merge Tactics : en-tête avec chrono et classement du groupe (prochain adversaire en rouge), compteurs de pays et de styles à gauche, plateau au centre, banc, puis mercato.
- **Une couleur par pays** sur le maillot des joueurs et dans les compteurs de pays (badge plein ; palier non atteint = fond grisé). Maquette : France bleu marine, Espagne orange, Brésil vert, Italie bleu clair. Compteurs de styles en gris anthracite.
- **Banc de 5 places.**
- **Plateau** : cases de couleur à 30 % d'opacité avec fin contour blanc, noms de poste à 30 %. **Fond : vraie pelouse** (12/11 : le vert très clair #c4dbcd « ne fait pas terrain de foot ») ; dans le prototype, vert rayé avec tracé blanc complet (ligne médiane, rond central, surface, point de penalty, but), cases à 38 % et noms à 60 % pour rester lisibles.
- **Gardien** : une seule case, en double losange (deux hexagones fusionnés), sous le DC central.
- **Joueurs en bustes de figurines** (style 3D « jouet en vinyle », original), sans pieds, sur un socle. **Posture des bras différente selon le style** (rempart bras croisés, créateur qui montre la direction, combatif poing levé, technicien ballon sur le doigt, presseur penché en avant, rapide bras en course, finisseur qui se désigne). Nom affiché seulement au toucher.
- **Fusions** : aura qui épouse la silhouette et anneau du socle, d'une couleur par niveau : 1 = bleu, 2 = or, 3 = violet avec étincelles. Plus d'étoiles ni de crans.
- Écran compact, peu de noir (panneaux clairs).
- **Tactique d'équipe (12/11)** : liste déroulante au-dessus du terrain, **une seule tactique à la fois** : Équilibrée (par défaut, le réglage moyen du moteur), Pressing, Gegenpressing, Contre, Tiki-taka. Effets dans le moteur depuis le 12/11 (demande du concepteur, chiffres en PROPOSITION : voir « Tactiques et styles dans le moteur »).
- **Écran du match (12/11, demande du concepteur)** : tactique de chaque équipe modifiable **en plein match** ; boutons pour **activer ou couper les tactiques et les styles** ; tableau de bord (tactiques, paliers atteints, possession, passes réussies, hauteur des lignes) pour juger l'impact.
- **Écran du match « aussi fun et beau que la préparation »** (12/11, demande du concepteur ; rendu en PROPOSITION) : panneaux clairs, tableau de score avec chrono et barre de possession, pelouse rayée ; **joueurs en figurines sur leur socle**, comme sur la préparation (pastilles rondes avec le visage essayées puis abandonnées : « pas assez visibles », puis « le cercle avec les têtes n'est pas terrible »), aura de fusion ; adversaires : mêmes bustes recolorés en maillot rouge et retournés (références, quelques copies de tes joueurs : prévoir des figurines adverses propres) ; porteur sur un socle doré avec son nom ; **trois vues à comparer** (12/11, « c'est quand même un sacré bordel » avec 22 figurines) : Pions (ronds bleus pour toi, rouges pour l'adversaire, écartés à l'affichage s'ils se chevauchent ; seul le porteur ou le dernier à avoir touché le ballon en figurine, sans clignoter ; par défaut), Figurines (petites), Caméra qui suit le ballon (contraire à « terrain entier visible » : essai seulement) ; annonces qui sautent, confettis sur un but ; tableau de bord en cartes.
  - (12/11, le concepteur n'arrive pas à choisir entre Pions et Figurines : « laisse tomber la caméra ou propose mieux ») **Caméra retirée**. PROPOSITION : vue **« Action »**, par défaut : les joueurs proches du ballon (moins de 13 m ; pions de nouveau au-delà de 18 m, sans clignoter) en figurines, les autres en pions, terrain entier visible. Pions et Figurines gardées pour comparer.
  - **Ballon moderne** (12/11, « le ballon n'est pas beau par rapport au reste ») : PROPOSITION : sphère brillante, motif bleu et or qui tourne quand il roule, reflet, halo clair ; en l'air au-dessus de son ombre ; traînée derrière les ballons rapides.
- **Styles coupés pendant les matchs pour l'instant** (concepteur, 12/11) : interrupteur gardé pour essayer.
- **En match, maillots d'équipe** (12/11, concepteur : « les points et maillots adverses sont rouges, moi ils devraient être bleus ») : **ton équipe en bleu** (pions et figurines), **l'adversaire en rouge**. **Tous les maillots d'une équipe identiques** (même couleur, sans bandes) et **le même socle pour tous**, **aux couleurs de l'équipe : anneau bleu sous tes joueurs, rouge sous les adversaires** (12/11 au soir, « les cercles sous les joueurs doivent être de la même couleur que les maillots » ; le porteur garde son socle doré) ; **seule la flamme de fusion** (aura bleue, or ou violette autour de la figurine) reste colorée (12/11). Les couleurs de pays restent sur l'écran de préparation. Dans le prototype, figurines recolorées par `scripts/recolorer-equipe.py` et `scripts/recolorer-adversaires.py`.
- **Match en deux mi-temps dans le prototype** (12/11, demande du concepteur) : **vitesse ×3,5 par défaut** (12/11 ; une mi-temps ≈ 51 s à l'écran ; avant : 60 s en ×3, puis 45 s en ×4 ; 180 s de jeu simulé, chrono en minutes de match 0' → 45' → 90') ; à la mi-temps et à la fin, **panneau de statistiques** (possession, tirs et tirs cadrés, passes réussies, tacles, fautes, corners, hors-jeu, arrêts) ; tactique modifiable à la mi-temps ; l'adversaire engage la 2e mi-temps. Réglage de test : la cible validée reste la mi-temps de 10 s en montage accéléré.
- **Styles en pictogrammes** dans les compteurs (12/11) : Rempart = bouclier, Récupérateur = aimant vertical, pôles en haut (il « aimante » le ballon ; choisi après la main, le bras plié et le poing, jugés peu identifiables), Technicien = ballon, Rapide = éclair.
- **Tactique** : « Tactique » et le nom de la tactique choisie à des tailles proches (12/11).
- **Style de chaque joueur visible** (12/11, « je ne sais pas quel joueur a quel style ») : pastille du pictogramme sur le buste (terrain, banc, mercato) ; au toucher, « Nom · Style ».
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
- **Début de tournoi : draft** (concepteur, 13/11, sur le modèle du Draft d'Ultimate Team) : on touche un poste, le jeu propose 4 ou 5 joueurs au hasard, on en choisit un. **Limité par un budget.** **Les remplaçants aussi sont draftés.** Puis on lance le premier match ; **après chaque match, un mercato.** Idées du concepteur à préciser : 5 à 10 pays, tout le monde a accès à tous les joueurs, hasard des cartes, budget initial, valeur des cartes ; **fusions possibles dès le départ à partir des remplaçants**. [OUVERT] Deck de 4-5 pays par joueur ou tous les pays pour tous ; budget du draft ; liste des cartes.
- **Styles (12/11)** : prochain chantier. **4 styles pour la première version** (7, c'était trop) : **Récupérateur, Technicien, Rapide, Rempart** (« Presseur » renommé **Récupérateur** le 12/11 : le concepteur n'aimait ni le terme ni le pictogramme, et le nom se confondait avec la tactique Pressing), en deux paires opposées (pressing contre conservation ; vitesse en contre contre défense qui recule vite). Créateur, Finisseur et Combatif sont mis de côté. **Certains joueurs n'ont aucun style.** **Le choix tactique de l'équipe (pressing, contre, passes courtes…) est séparé des styles** : l'équipe a sa tactique en plus des styles de ses joueurs, les styles ne la débloquent pas. **Pas de styles propres au gardien.** **Styles et notes ne se définissent pas ensemble pour l'instant** : on vérifie d'abord la cohérence des styles dans le moteur, pas la liste finale des joueurs.

### Caractéristiques des joueurs (concepteur, 12/11 au soir)
- **4 notes, 2 sous-notes chacune** : **Vitesse** (accélération, vitesse de pointe) ; **Technique** (passe ; dribble, qui comprend la protection du ballon) ; **Tir** (précision, puissance) ; **Physique** (**duel**, plutôt que tacle : tacles, interceptions, duels d'épaule, jeu aérien ; endurance). Remplace la liste indicative d'attributs.
- **L'endurance est un point clé** (12/11 au soir) : elle fait ralentir les joueurs **au bout de 30 minutes d'affilée** et **au bout de 60 minutes au total** dans le match, d'autant plus que l'endurance est mauvaise.
- **La vitesse d'un joueur est super importante** (12/11 au soir).
- **Fiche joueur à la Clash Royale** (12/11 au soir) : une fiche jolie, avec le détail (pas une carte façon FC). Jugée bien (13/11).
- **Mercato** (13/11) : **un toucher montre la fiche (les notes)** ; **rester appuyé permet de déplacer la carte**.
- **Buteurs** (13/11) : le nom des buteurs à la mi-temps et en fin de match.
- **Vue Action** (13/11) : autour du ballon, tous les joueurs doivent passer en figurines, de façon fluide (certains restaient en rond).
- **Gardien : 4 caractéristiques à lui**, pas encore choisies. Pour l'instant, pas de notes (laissé blanc).
- Il faut que les notes aient **un vrai impact** dans le moteur.

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
- (Remplacé le 12/11 par les 4 notes validées : voir « Caractéristiques des joueurs ».)

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
  - **sans le ballon, défense par lignes** : chaque poste rejoint sa ligne (gardien ; défense : DC, DG, DD ; milieu : milieu central et côtés ; attaque : attaquant). La ligne défensive se tient 18 m derrière le ballon, entre 12 et 38 m de son but (bloc médian), et **s'y rend à vitesse limitée** (recule de 3 m/s, remonte de 5 m/s au plus ; recule à 7 m/s si le ballon arrive à moins de 8 m devant elle) ; milieu 11 m devant, attaque 23 m devant. Le placement compte en profondeur à 45 % en défense, 70 % au milieu et en attaque (12/11, « zones trop étroites sur la hauteur ») : **un latéral placé haut revient dans la ligne de défense**, mais les hauteurs de placement restent lisibles. Chaque ligne de 3 joueurs ou plus tient entre 39 et 44 m de large, ordre gauche-droite gardé, 6 m au moins entre voisins, coulissement vers le ballon (45 %) ; **(12/11, « DC trop décalés »)** les défenseurs centraux restent près de l'axe (écart ×0,65) et une ligne trop étroite s'élargit par ses extrémités : DC à environ 16 m l'un de l'autre (24 m avant) ;
  - **avec le ballon** (refait le 11/11 après « gros problème de placement durant le match ») : l'équipe s'étire entre une **ligne arrière à 15 m derrière le ballon** (entre 15 et 55 m de son but) et une **ligne avant 1 m en deçà de la ligne que tient l'adversaire** (hors-jeu) ; 30 à 50 m de long ; **entre les deux, l'ordre de profondeur du placement est gardé** (la case la plus basse du plateau donne la ligne arrière, la plus haute la ligne avant) ; l'équipe s'écarte en largeur ;
  - **aucune cible ne dépend de la position du moment d'un autre joueur**, seulement du ballon, du placement et des hauteurs de ligne tenues par les équipes (fonction du ballon et du temps) ; sinon boucle : la ligne adverse s'enfonçait dans sa surface ;
  - **transitions** (12/11, après « l'équipe doit rester groupée pendant les transitions » et « mouvements robots, synchronisés ») : chaque joueur réagit à son tour (0,2 s + 0,008 s par mètre du ballon + 0 à 0,35 s), les plus proches du ballon d'abord ; puis sprint de transition à 8 m/s pendant 5 s au plus, sinon course à 7 m/s, avec ± 6 % de vitesse et d'accélération selon le joueur ; à la perte du ballon, la ligne défensive part de la hauteur des défenseurs en attaque et recule pas à pas pendant que le milieu revient ; les attaquants qui récupèrent visent la ligne que l'adversaire tient vraiment ; un joueur placé haut revient toujours en retard (contrepartie naturelle) ;
  - **perception** : chacun voit le ballon avec un petit retard (0,1 à 0,3 s selon le joueur, + 0,004 s par mètre) ; le bloc ne démarre plus d'un seul coup ;
  - **évitement anticipé** : 3 m au minimum entre coéquipiers, 2,5 m entre adversaires.
- **Ballon et actions** (12/11, `src/sim/ballon.ts`, chiffres dans `reglages.json` → `ballon`) :
  - ballon porté ou libre (frottement), possession au dernier qui l'a touché ; ballon aérien (centres, dégagements) intouchable pendant 80 % du vol ;
  - porteur : décision toutes les 0,6 à 1,2 s ; tir (surface, seul devant, parfois de loin), centre depuis l'aile, dribble face à un adversaire proche, passe notée (progression, espace, distance, voie libre, largeur), passe dans l'espace vers un coéquipier lancé, rotation du ballon si l'avant est bouché, dégagement long sous pression près de son but, protection du ballon ;
  - défense : un presse, un couvre ; **un défenseur central sort sur le porteur dans l'axe jusqu'à 18 m** (12/11, « ils ne vont pas vers le BU ») ; contre-pressing 4 s après une perte (3 joueurs) ; près de son but, marquage côté but et recul rapide de la ligne ; contres (ballon rapide dévié) ; tacle, faute 4 fois sur 10 ;
  - gardien : plonge vers le point de passage du tir, arrête selon l'écart et la distance, repousse parfois en corner ;
  - règles : hors-jeu au départ de la passe, faute → coup franc (adversaires à 9,15 m) ou penalty, corner, six mètres, touche, but et engagement ;
  - repères mesurés (12 matchs de 3 min) : 1,25 but, 9 tirs, 4 arrêts, 2 fautes, 2 à 3 touches par match ; 77 % de passes réussies ; 5,8 changements de camp par minute (vrai football : 2 à 3).
- **Plateau de placement** (hexagones validés le 11/11 ; carrés gardés en variante) : couleurs jaune gardien, bleu défense, violet milieu, rouge attaque ; couloirs des côtés plus clairs ; rôle écrit dans la case.
  - **Hexagones (par défaut)** : G 1 (double losange, 12/11), DC 5 (3 + 2), DG 3, DD 3, milieu 8 (MDC 3, MC 2, MOC 3), ailiers 3 + 3, attaque 5 (2 + 3). **Nombre de cases à valider** : le découpage validé (DC 6, milieu 9, attaque 6) n'est exact qu'en carrés.
  - **Carrés** : 5 cases par rangée, exactement le découpage validé.
  - Gardien : une case en double losange sous le DC central (12/11). Coins hauts sans case. En changeant de forme, chaque joueur garde son poste, sur la case la plus proche.
- Maximums provisoires (non validés) : DG 1, DD 1, milieu 4, AD 1, attaquant 3 (validés en exemple : 3 DC, 1 AG ; le gardien : 1).
- **Écran de placement sur une page** (11/11 ; remplacé le 12/11 par l'écran de préparation de la maquette) : plateau + banc en ronds dessous. Tout au glisser-déposer : sur une case libre, sur un joueur (échange, ou entrée d'un remplaçant), sur le banc (sortie). Plateau toujours visible ; choix hexagones / carrés en haut à droite. Plus de liste ni de boutons de poste.
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
- **Proposition de Claude (12/11)**, base de départ, à juger en regardant des matchs. Chaque style a un effet sur le joueur, un effet d'équipe aux paliers et une contrepartie. Seuls Presseur, Rempart, Rapide et Technicien sont retenus pour la première version (validé le 12/11). Cercle possible, à vérifier en match : Technicien bat Presseur, qui gêne la relance du Rempart, qui ferme les espaces du Rapide, qui punit en contre l'équipe montée pour garder le ballon. Créateur (il faut d'abord les appels et démarquages), Finisseur et Combatif (trop proches des futures notes) attendent :
  - Récupérateur (ex-Presseur) : presse plus tôt et plus longtemps / contre-pressing renforcé / espaces dans le dos ;
  - Rempart : marquage plus serré, tacles plus sûrs / la ligne de défense recule plus vite / relance plus pauvre ;
  - Rapide : sprint de transition plus fort / plus de contres et de passes dans l'espace / plus de pertes de balle en conduite ;
  - Technicien : protège le ballon, passes courtes plus sûres / l'équipe garde plus le ballon (moins de changements de camp) / jeu moins vertical ;
  - Créateur : plus de passes qui cassent les lignes / les coéquipiers font plus d'appels / passes plus risquées ;
  - Combatif : gagne plus de duels, réagit vite après une perte / plus de récupérations au milieu / plus de fautes ;
  - Finisseur : tire plus tôt et mieux cadré / plus de joueurs dans la surface sur les centres / défend moins.
  - Première étape proposée : coder les 4 styles retenus, et vérifier qu'ils se voient dans le match.
  - Écran de préparation (12/11) : compteurs des 4 styles ; dans les données de démonstration, 7 joueurs sur 18 n'ont pas de style (dont le gardien).

Tactiques et styles dans le moteur (12/11, PROPOSITION, à juger en regardant des matchs ; détail et mesures dans `journal.md`) :
- Ils **modulent les réglages** du moteur, équipe par équipe (`src/sim/influences.ts`, chiffres dans `src/data/influences.json`). Sans tactique ni style : réglages de base, moteur inchangé.
- Pressing : bloc haut, pressing de plus loin, 3 joueurs sur le porteur, **fermeture des lignes de passe** par les milieux et attaquants (nouveau comportement, référence §4), plus de tacles et de fautes. Gegenpressing : contre-pressing 7 s à 5 joueurs. Contre : bloc bas, peu de pressing, jeu vertical et long, transitions plus longues. Tiki-taka : passes courtes, joueur libre préféré à l'avancée, rotation, peu de tirs de loin.
- Styles : effet individuel (Récupérateur presse et tacle plus ; Technicien passe plus juste, dribble et protège mieux ; Rapide court plus vite, dribble moins sûr ; Rempart tacle plus, moins de fautes, relance moins précise) et effet d'équipe à 3 joueurs.
- Mesures sur 30 matchs de 3 min (`scripts/mesurer-influences.ts`) : effets nets pour Pressing (ligne +6 m, récupérations hautes, tirs rapides, moins de buts encaissés), Contre (bloc bas, meilleure attaque, passes moins réussies) et Tiki-taka (61 % de possession, 86 % de passes réussies) ; Gegenpressing et styles plus discrets. Point faible : le Pressing ne fait pas encore baisser la réussite des passes adverses.
- **Révision du 12/11** (demande : « vérifie que les stats de chaque tactique sont cohérentes »), mesures sur 40 matchs avec `scripts/mesurer-jeu.ts`, styles coupés, tableau dans `journal.md`. Nouveaux leviers : contre-attaque (5 s après la récupération, jeu vers l'avant et appels), jeu long (ballon aérien vers un attaquant lancé), gêne du pressing (passes moins précises, contrôles ratés quand on est serré), contre-pressing (tacles plus francs, porteur précipité). Résultat : Tiki-taka 62 % de possession, 47 passes, 91 % ; Contre bloc bas, le moins de passes (22), les plus verticales (11 m gagnés par passe contre 9) et les plus longues (49 % de ballons longs), tir le plus vite après la récupération ; Pressing : passes adverses réussies 73 % (81 %), récupérations plus hautes ; Gegenpressing : 51 % des pertes en jeu reprises en 5 s (41 %). Limite : la possession du Contre baisse peu (48 %).

Notes dans le moteur (12/11 au soir, PROPOSITION ; `src/sim/notes.ts`, chiffres dans `src/data/notes.json`, mesures dans `journal.md`) :
- Sous-notes sur 99 ; note affichée = moyenne des deux ; sous-note absente (et gardien) = 65. **À 65 partout, le moteur est inchangé** (test).
- Règle unique : on compare la sous-note de l'un à celle de l'adversaire direct. Probabilité décalée sur sa cote de l'écart ÷ 15 (+10 points ≈ 50 → 66 %) ; taux × exp(écart × coefficient). La note globale n'entre pas dans le moteur.
- Vitesse : pointe ± 0,6 %/point, accélération ± 1 %/point. 1 contre 1 : dribble − duel + ½ écart d'accélération (réussite et envie de tenter). Passe : imprécision (passes, centres, ballons longs), interceptions plus difficiles. Dribble : aussi contrôle quand on est serré, tacles subis. Tir : précision (visée), puissance (vitesse, arrêts). Duel : tacles, fautes (défenseur dépassé), portée sur le ballon.
- Mesures (120 matchs de 3 min contre une équipe à 65) : à 80 partout, 68 % de victoires, 27 % de nuls, 5 % de défaites ; 75 : 43 / 53 / 5 ; 60 : 15 / 68 / 18. Chaque note a sa signature (Technique : possession et moins de va-et-vient ; Tir : deux fois plus de buts ; Vitesse : plus de tirs ; Duel : moins de tirs adverses). Ailier star (90 en Vitesse contre un latéral à 55) : effet visible mais modeste, le moteur ne cherche pas encore les duels favorables.
- Joueurs de démonstration notés dans `preparation.json` ; l'adversaire du prototype n'a pas de notes (équipe moyenne).
- **Révision de la nuit du 12/11** (détail et mesures dans `journal.md`) :
  - **Fatigue** : au-delà de 30 min d'affilée (la mi-temps en cours) et de 60 min au total, −0,2 % de vitesse et d'accélération par minute de dépassement (les deux s'ajoutent), × exp(−(endurance − 65) × 0,04), 25 % au plus ; fin de match : endurance 40 → −24 %, 65 → −9 %, 90 → −3 %. 45 min = 180 s simulées.
  - **Vitesse** : pointe ± 0,8 %/point (90 → 9,6 m/s en sprint), accélération ± 1,2 %/point ; 1 contre 1 : accélération × 0,8 ; le moteur cherche les duels de vitesse (passe vers l'avant et appel en profondeur vers le plus rapide face à son adversaire).
  - **Buts** : un défenseur sur la trajectoire ne touche un tir qu'une fois sur deux (41 % des tirs étaient contrés) ; tirs plus précis ; gardien moins fort (arrêt 0,65 au plus) ; un peu plus de tirs de loin et de passes dans la surface. 2,4 buts par match (0,9 avant), 8 tirs, 29 % de conversion.
  - **Pauses** : 3,2 à 3,8 s de jeu avant une remise en jeu, 7 s après un but ; annonces en temps de jeu (2,5 s, 5,5 s pour un but), finies avant la reprise.
  - Résultats (80 matchs complets contre une équipe à 65) : 70 partout 61 / 16 / 23 % ; 75 : 76 / 18 / 6 ; 80 : 90 / 4 / 6 ; Vitesse 80 seule : 63 % de victoires (29 % sans notes). **Vigilance** : 80 contre 65 gagne 9 fois sur 10 ; si c'est trop, échelle 15 → 20.
  - **Fiche joueur** (`src/ui/fiche.ts`) : toucher un joueur (terrain, banc, mercato) l'ouvre ; depuis le mercato, bouton « Recruter · prix » (ou « Fusionner »). Appui long sur une carte du mercato : la glisser sur le banc (achat), une case libre (achat et placement), un joueur (achat et remplacement) ou sa copie (fusion) ; hors poste refusé sans achat (13/11). En-tête aux couleurs du pays (nom, poste, style, fusion), buste qui déborde, 4 notes (pictogramme, couleur, valeur en pastille : violet 80+, vert 70+, jaune 60+, rouge dessous) et 2 sous-notes en barres animées ; gardien : « ses 4 notes arrivent bientôt ».
  - **Vue Action** (13/11) : figurine tout de suite à moins de 16 m du ballon ou du centre de l'action, retour en pion après 1,2 s à plus de 25 m ; fondu croisé pion ↔ figurine. **Buteurs** : enregistrés par le moteur (`balle.buts` : équipe, buteur, contre son camp, minute), affichés dans le panneau de mi-temps et de fin.

Mouvements (12/11, PROPOSITION, après « améliore le moteur pour le rendre encore plus réaliste dans les mouvements ») :
- **Allures** : on suit sa place et on rattrape l'écart en douceur (marche, trot, course) ; pleine vitesse près du ballon, au ballon, vers l'action, en repli côté but, ou en transition si loin de sa place ; freinage plus fort que l'accélération.
- **Repère de forme** : le bloc suit le ballon à vitesse limitée (4,5 m/s en largeur, 5 pour monter, 10 pour revenir), et se replace d'un coup sur un arrêt de jeu ; le surnombre et les joueurs au ballon suivent le vrai ballon.
- **Jeu sans ballon** : appels en profondeur (en diagonale, suivis par le défenseur le plus proche) ; soutien (les deux plus proches se rapprochent du porteur et ouvrent une ligne de passe). Décalages bornés autour de la place.
- Mesures : vitesse moyenne 4,4 m/s (4,7 avant ; vrai football environ 2), sprint 15 % du temps (18 %) ; soutien près du porteur dans le dernier tiers 1,6 coéquipier (1,4) ; 11 appels par match.

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
- Effets chiffrés des 4 styles de la première version ; paliers ; retour éventuel de Créateur, Finisseur, Combatif ; part des joueurs sans style.
- Couleurs au-delà de l'Or ; écarts de niveau entre adversaires (appariement ou plafond) ; ressources pour faire évoluer les cartes.
- Moteur technique final ; dimensions du terrain ; coordonnées et tailles des rectangles ; liste finale des postes.
- Comportement exact de chaque poste ; liste des consignes tactiques.
- **Notes (12/11)** : les 4 caractéristiques du gardien ; récupération à la mi-temps et remplacements (avec la fatigue) ; points donnés par un niveau de carte et par une fusion (piste : +1 par niveau, +4 par aura) ; note globale selon le poste (proposée) ; retirer des styles leurs bonus de précision et de vitesse (proposé : le style dit ce que fait le joueur, les notes s'il le réussit) ; note de match sur 10 à la mi-temps (proposée) ; faire chercher par le moteur les duels favorables (ailier rapide contre latéral lent).
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

- **Prototype 1** (web, `prototype/`, 93 tests verts) : plateau en hexagones, projection v4 (lignes, transitions, réactions individuelles), **ballon réel** (passes, tirs, centres, dribbles, interceptions, contres, pressing et contre-pressing, gardien qui plonge, hors-jeu, fautes, penalty, corners, touches, six mètres, engagement), sons et annonces. Lien : https://claude.ai/artifact/B86yGS9jR47LwubdEiL5EN
- **12/11 : moteur jugé satisfaisant pour ce stade** par le concepteur. Interface traitée le 12/11 (voir plus bas) ; **ensuite : les styles** (les notes des joueurs viendront après : la réussite des passes, des tirs, des arrêts en dépendra).
- Limites connues du moteur : encore trop de changements de camp ; presque pas de hors-jeu ; aucune qualité individuelle (tous les joueurs passent et tirent pareil) ; appels et soutien encore simples (12/11) ; on court encore trop (3,9 m/s en moyenne, vrai football environ 2) ; encore 5,4 changements de camp par minute (vrai : 2 à 4), les passes ratées en tête des pertes.
- Règle de séance (concepteur, 12/11) : **économiser les tokens** : peu de lectures, peu de tests et de captures, le concepteur valide lui-même ; mettre à jour le projet claude.ai seulement aux grandes étapes ; réponses courtes ; une conversation par sujet.
- **12/11 (interface)** : maquette de l'écran de préparation (bustes, couleurs par pays, fusions en couleurs) : https://claude.ai/artifact/67QRVRz7Fd6f8YWD9gHPq4. Décisions dans « Interface (séance du 12/11) ».
- **12/11 : écran de préparation intégré au prototype** (moteur inchangé, 93 tests verts) : bustes, hors poste refusé, banc de 5, mercato (achat, fusion automatique, vente au glisser). Données dans `src/data/preparation.json`. Chrono et classement fixes ; budget, prix et revente provisoires ; achats non gardés au rechargement. Pelouse rayée avec tracé complet (le vert pâle « ne faisait pas terrain de foot »).
- **12/11 : tactiques et styles dans le moteur** (100 tests verts), avec commandes de comparaison sur l'écran du match. **À valider par le concepteur en regardant des matchs** ; ensuite : réglages fins, puis notes des joueurs.
- **12/11 au soir : travail sur le moteur mis en pause par le concepteur** (« ça prend forme mais pas totalement » ; restent : trop de course, encore du va-et-vient). **Prochaine étape : les cartes et les caractéristiques des joueurs, dans une nouvelle conversation.** Pour brancher les caractéristiques sur le moteur, les points d'entrée existent déjà : `EffetJoueur` (`src/sim/influences.ts` : vitesse, pressing, tacle, fautes, imprécision des passes, dribble, protection), aujourd'hui rempli par les styles (coupés en match) ; `JoueurSim.facteur` (± 6 % de vitesse et d'accélération, en attendant l'attribut « vitesse ») ; dans `reglages.json` → `ballon`, la précision des tirs (`tir.erreurBaseM`, `erreurParMetre`), les arrêts du gardien (`tir.arretMax`, `arretMin`), le contrôle sous pression (`gene.controleRate`). Questions ouvertes à traiter : liste des attributs, notes et niveaux des cartes, couleurs de niveau (en pause), effets chiffrés des styles, fusions.
- **13/11 dans la nuit : mercato au toucher (fiche) et à l'appui long (glisser pour recruter), vue Action plus fluide, buteurs** (115 tests verts). Le concepteur juge l'ensemble « pas mal ». **Prochaines étapes demandées : le plan global des cartes (pays, liste de toutes les cartes, noms, valeurs, hasard des cartes, budget initial, tout le monde a accès à tous les joueurs), le draft de début de tournoi (titulaires et remplaçants, avec budget ; voir « Deck, mercato et traits »), puis les fusions.** Proposition de Claude (13/11, non validée) : 8 pays de 16 joueurs (128 cartes), prix de 1 à 5 pièces selon la note, réserve commune à copies limitées, budget de draft d'environ 30 pièces pour 16 joueurs.
- **12/11 dans la nuit : fatigue, vitesse, buts, pauses, fiche joueur** (113 tests verts). 2,4 buts par match. **À juger par le concepteur** : nombre de buts, poids des notes (80 contre 65 gagne 9 fois sur 10), fiche.
- **12/11 au soir : notes des joueurs dans le moteur** (112 tests verts) : 4 notes validées, 8 sous-notes branchées (endurance sans effet pour l'instant, gardien sans notes). Chiffres en PROPOSITION, mesures dans `journal.md`. **À juger par le concepteur en regardant des matchs.**
- (Avant :) **Prochaine étape (12/11) : les styles**, dans une nouvelle conversation. Décisions dans « Deck, mercato et traits » (4 styles : Récupérateur, Technicien, Rapide, Rempart ; joueurs sans style possibles ; tactique d'équipe séparée ; pas de style de gardien ; pas de notes pour l'instant) ; proposition de départ dans « Traits ».
