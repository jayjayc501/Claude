# Historique retiré de CLAUDE.md (12/11 et 17/11/2026)

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


---

# Retiré de CLAUDE.md le 17/11/2026 (réorganisation, prompt A4 de l'audit du 16/11)

L'ancien `CLAUDE.md` (442 lignes, commit `9885b08`) est découpé en cinq fichiers : `CLAUDE.md`, `docs/decisions.md`, `docs/propositions.md`, `docs/questions-ouvertes.md` et ce fichier. On trouve ici ce qui a été **remplacé**, ce qui est **dépassé**, et l'ancienne section « État ». Pour chaque point, la flèche dit ce qui l'a remplacé.

## Décisions remplacées

- « En cas de doute ou de contradiction, le dossier fait foi (le §20 prime sur les sections plus anciennes), puis le concepteur. » → 17/11 : les décisions datées de `docs/decisions.md` priment sur le dossier, qui reste la référence pour le reste.
- **Mi-temps de jeu : 10 s à l'écran, en montage accéléré à vitesse variable** (11/11). Le moteur simulait toute la mi-temps et l'écran enchaînait les actions importantes. → Le 16/11, la cible de 10 s est jugée trop courte : on essaie une mi-temps de 30 s au rythme ×3,5, et le montage devient la solution de repli. La phrase du 12/11, « Réglage de test : la cible validée reste la mi-temps de 10 s en montage accéléré », tombe avec elle.
- « Préparation et mi-temps : plus de 10 s. **L'ancien total de 40 s n'est plus valable.** » La seconde phrase est gardée ici pour mémoire.
- Vitesse d'affichage du match dans le prototype : 60 s par mi-temps en ×3, puis 45 s en ×4. → ×3,5 depuis le 12/11, soit environ 51 s.
- **Postes classiques : G, DC, DD, DG, MDC, MC, MOC, MD, MG, AD, AG, AC (liste à finaliser)** (11/11). → Postes des joueurs (12/11) : G, DC, DG/DD, MC, AG/AD, BU ; MDC, MOC et MD/MG ne sont que des repères.
- « Placé hors de son poste, il est moins efficace mais reste utilisable. » → Placement hors poste refusé par l'interface (12/11).
- **Défenseurs centraux, milieu, attaque : 3 cases par ligne, la case de l'axe à cheval sur celle de gauche et celle de droite** (colonnes qui se chevauchent). Appliqué dans le prototype le 11/11. → Remplacé le même jour par le plateau unique, en hexagones ou en carrés, à la demande du concepteur. En hexagones, le « à cheval » vient des rangées décalées.
- Zones « plus chevauchantes » (11/11). → Le concepteur est revenu dessus : les grandes zones ne se chevauchent pas, ou à peine.
- « Moteur avec ballon réel jugé satisfaisant… **Prochaine étape : interface, puis concept des cartes et des notes, dans une nouvelle conversation.** » (12/11) → Étape faite.
- **Écran du match (12/11, demande du concepteur)** : tactique de chaque équipe modifiable en plein match, boutons pour activer ou couper les tactiques et les styles, tableau de bord (tactiques, paliers atteints, possession, passes réussies, hauteur des lignes) pour juger l'impact.
  - → 13/11 au soir : les tactiques se changent avant le coup d'envoi et à la mi-temps seulement.
  - → 15/11 : plus rien sous le terrain ; les interrupteurs et le tableau de bord sont retirés.
  - « Changer d'onglet en plein match (le match recommence au coup d'envoi, même graine) : gardé tel quel pour l'instant, à bloquer plus tard pour le jeu en ligne » (13/11). → Onglets retirés le 15/11.
- **Trois vues à comparer** (12/11, « c'est quand même un sacré bordel » avec 22 figurines) :
  - Pions, la vue par défaut : ronds bleus et rouges, écartés à l'affichage s'ils se chevauchent ; seul le porteur, ou le dernier à avoir touché le ballon, en figurine, sans clignoter ;
  - Figurines, petites ;
  - Caméra qui suit le ballon, contraire à « terrain entier visible » : un essai seulement.

  → Le concepteur : « laisse tomber la caméra ou propose mieux ». La caméra est retirée et la vue « Action » est proposée par défaut le 12/11 : figurines à moins de 13 m du ballon, pions au-delà de 18 m. Pions et Figurines sont gardées pour comparer. → 13/11 : réglages de la vue Action. → 15/11 : **vue Action seule**.
- Adversaires en match : les mêmes bustes, recolorés en maillot rouge et retournés. C'étaient des références, avec quelques copies de tes joueurs ; il fallait prévoir des figurines adverses propres. → 13/11 : un buste par carte, en version bleue et rouge.
- **Styles coupés pendant les matchs** (12/11). → Styles actifs en match (13/11). L'« interrupteur gardé pour comparer » a été retiré le 15/11.
- « En match, seule la flamme de fusion (aura bleue, or ou violette autour de la figurine) reste colorée » (12/11). → 14/11 : le feu est aux couleurs de l'équipe.
- **Fusions en match, 14/11 matin** (« au début un halo qui se transforme en flamme ») : halo au niveau 1, flamme aux niveaux 2 et 3, bleue pour toi, rouge pour l'adversaire. → **Crescendo** (14/11) : 1 = halo ; 2 = halo et flamme ; 3 = halo plus grand, grande flamme double et étincelles. → **Rendu « M2 »** (14/11 après-midi). La couleur de l'équipe et le crescendo restent en vigueur.
- **Styles (12/11) : « prochain chantier »**. → Fait les 12/11, 13/11 et 14/11.
- **Deck de 4 ou 5 nationalités par joueur avant un tournoi**, les joueurs proposés venant de ces nationalités (11/11).
  - → 13/11 : au début, les mêmes pays pour tout le monde. Plus tard, une option pour choisir ses pays dans une liste en début de compétition.
  - → 16/11 : chaque joueur choisit ses pays, 5 par match, 10 à 15 pays ou plus à terme.
- « Les remplaçants aussi sont draftés ». → 13/11 : seuls les 11 titulaires sont draftés ; le banc se remplit par un premier mercato.
- Budget de 30, puis de 40. → 50 (13/11, confirmé le 16/11).
- **Idées du concepteur à préciser** (13/11) :
  - 5 à 10 pays → 10 à 15 pays ou plus, le 16/11 ;
  - tout le monde a accès à tous les joueurs → « chacun son mercato », le 16/11 ;
  - hasard des cartes ;
  - budget initial → 50 ;
  - valeur des cartes → prix de 1 à 5 ;
  - fusions possibles dès le départ à partir des remplaçants → gardé dans `decisions.md`.
- **Hybrides** (11/11), **mis de côté le 16/11** (« je pense que c'est pas top ») :
  - la fusion de 2 joueurs différents **de même nationalité** donne un joueur hybride, qui garde la nationalité commune ;
  - un hybride n'a **jamais plus de 2 identités d'origine** : A/B oui, A/B/C jamais ;
  - pistes appréciées, des intentions et pas encore des règles chiffrées : noms combinés, visage partagé en deux, transformation visuelle de plus en plus spectaculaire (style original, rien de copié), meilleure valeur de chaque statistique, cumul des bonus.

  Les questions sur les hybrides sont dans `questions-ouvertes.md`, à la section « Si les hybrides reviennent ».
- « Prochain chantier : 1 contre 1 entre amis par un lien… (l'arbitre serveur reste à écrire ; l'arbitre et le film du 13/11 sont faits pour ça) ». → Fait le 15/11.
- « Site : attendre l'accès au dépôt `FootMergTactic` » (15/11). → Accès donné, site en ligne le 15/11.
- Premier écran : « 1 contre 1 marqué « Bientôt » ». → Le 1 contre 1 est jouable depuis le 15/11.
- Images de joueurs de la maquette : elles venaient de Kling (environ 14 crédits). C'étaient des références, pas les visuels du jeu, avec de petits logos et numéros à retirer. → 60 bustes, un par carte (13/11).
- Priorité au moteur (11/11) : « l'interface actuelle n'est qu'une base (les positions), loin de la vision finale du concepteur, qu'il décrira plus tard. 12/11 : vision en cours de définition ». → Vision décrite à partir du 12/11 (maquette, revue des écrans du 15/11).

## Propositions remplacées ou dépassées

- **Préparation et mi-temps de 20 à 30 s** pour commencer, soit un match d'environ 1 min à 1 min 20. → 5 minutes de préparation en tournoi en ligne, 10 minutes en 1 contre 1, mi-temps d'1 minute en ligne ; durée du match fixée le 16/11.
- **Écran de placement sur une page** (11/11) : le plateau, et le banc en ronds dessous.
  - Tout se faisait au glisser-déposer : sur une case libre, sur un joueur (échange, ou entrée d'un remplaçant), sur le banc (sortie).
  - Le plateau restait toujours visible, avec le choix hexagones / carrés en haut à droite. Plus de liste ni de boutons de poste.

  → Écran de préparation de la maquette (12/11).
- **Écran de match sur une page** (11/11) : coup d'envoi, pause, vitesse, son et zones au-dessus du terrain ; score, possession et dernier événement dessous ; annonces sur le terrain et sons de synthèse (Web Audio, `src/ui/son.ts`). → Revue du 15/11, qui retire le coup d'envoi, la vitesse et les zones, et vrais sons ElevenLabs le 15/11.
- (12/11) « Remplacé le 12/11 : hors poste refusé ; MDC, MOC, MD/MG sont des repères dans les blocs MC et ailiers. » Et la liste indicative d'attributs, remplacée le 12/11 par les 4 notes.
- **Boucle de tournoi** :
  - mercato de 3 joueurs, renouvelés après chaque achat → mercato de 6 dans la maquette et le prototype ;
  - « L'hybride reste une fusion volontaire, et la signature du jeu (Merge Tactics ne fusionne que des troupes identiques) » → hybrides mis de côté le 16/11 ;
  - « (12/11) Couleur de niveau en pause ; les fusions se voient par l'aura (bleu, or, violet avec étincelles), plus par des étoiles » → reporté dans `decisions.md` (§8 et §10).
- **Traits** (11/11) :
  - « Les bonus modifient des comportements du moteur plutôt que d'ajouter des points de statistiques. Styles possibles : presseur, technicien, rapide, rempart, créateur, combatif, finisseur. Certains peuvent raccourcir le délai de transition. » → 14/11 : bonus caché en points et comportement ; 4 styles retenus le 12/11 ;
  - « Paliers de bonus à 3, 5 et 7 joueurs, pour les styles comme pour la nationalité. » → 14/11 : styles à 3 et 5, pays à 5 et 8.
- **Proposition de Claude (12/11) sur les styles**, avec une contrepartie par style. → 14/11 : sans contrepartie. Texte d'origine :
  - chaque style a un effet sur le joueur, un effet d'équipe aux paliers et une contrepartie ;
  - cercle possible, à vérifier en match : Technicien bat Presseur, qui gêne la relance du Rempart, qui ferme les espaces du Rapide, qui punit en contre l'équipe montée pour garder le ballon ;
  - les styles en attente : Créateur (il faut d'abord les appels et démarquages), Finisseur et Combatif (trop proches des futures notes).

  Effets proposés, au format « effet sur le joueur / effet d'équipe aux paliers / contrepartie » :
  - Récupérateur (ex-Presseur) : presse plus tôt et plus longtemps / contre-pressing renforcé / espaces dans le dos ;
  - Rempart : marquage plus serré, tacles plus sûrs / la ligne de défense recule plus vite / relance plus pauvre ;
  - Rapide : sprint de transition plus fort / plus de contres et de passes dans l'espace / plus de pertes de balle en conduite ;
  - Technicien : protège le ballon, passes courtes plus sûres / l'équipe garde plus le ballon (moins de changements de camp) / jeu moins vertical ;
  - Créateur : plus de passes qui cassent les lignes / les coéquipiers font plus d'appels / passes plus risquées ;
  - Combatif : gagne plus de duels, réagit vite après une perte / plus de récupérations au milieu / plus de fautes ;
  - Finisseur : tire plus tôt et mieux cadré / plus de joueurs dans la surface sur les centres / défend moins.

  Première étape proposée à l'époque : coder les 4 styles retenus et vérifier qu'ils se voient dans le match. Sur l'écran de préparation (12/11) : compteurs des 4 styles ; dans les données de démonstration, 7 joueurs sur 18 n'avaient pas de style, dont le gardien.
- **Styles dans le moteur (12/11)** : effet individuel (Récupérateur presse et tacle plus ; Technicien passe plus juste, dribble et protège mieux ; Rapide court plus vite, dribble moins sûr ; Rempart tacle plus, moins de fautes, relance moins précise) et effet d'équipe à 3 joueurs. → 14/11 : bonus cachés sans contrepartie.
- **Premières mesures des tactiques** (30 matchs de 3 min, `scripts/mesurer-influences.ts`) : effets nets pour le Pressing (ligne +6 m, récupérations hautes, tirs rapides, moins de buts encaissés), le Contre (bloc bas, meilleure attaque, passes moins réussies) et le Tiki-taka (61 % de possession, 86 % de passes réussies) ; Gegenpressing et styles plus discrets. Point faible : le Pressing ne faisait pas encore baisser la réussite des passes adverses. → Révision du 12/11 (`propositions.md` §6).
- **Notes, première version (12/11 au soir)** :
  - vitesse de pointe ± 0,6 % par point, accélération ± 1 % par point → nuit du 12/11 : ± 0,8 % et ± 1,2 % ;
  - mesures sur 120 matchs de 3 min contre une équipe à 65 : à 80 partout, 68 % de victoires, 27 % de nuls, 5 % de défaites ; à 75, 43 / 53 / 5 ; à 60, 15 / 68 / 18 → mesures de la nuit du 12/11 ;
  - « le moteur ne cherche pas encore les duels favorables » → il cherche les duels de vitesse depuis la nuit du 12/11 ;
  - joueurs de démonstration notés dans `preparation.json` ; l'adversaire du prototype n'avait pas de notes → 60 cartes notées (13/11) ;
  - fiche du gardien : « ses 4 notes arrivent bientôt » → notes du gardien faites le 13/11.
- « « Tes bonus » au tableau de bord » (14/11). → Tableau de bord retiré le 15/11.

## Questions tranchées

- **Tranchées le 11/11/2026** (§20 du dossier) :
  - ce que représentent les 10 s ;
  - contre qui on joue ;
  - d'où viennent les joueurs et les copies ;
  - déplacer les rectangles ou non ;
  - plusieurs joueurs au même poste ;
  - nombre de groupes (2 groupes de 4) ;
  - une seule organisation pour l'instant ;
  - MD / MG, qui sont les cases basses des côtés ;
  - placement sur un demi-terrain ;
  - outil du prototype : le web.
- « Les 5 minutes de préparation valent-elles aussi pour chaque mercato et pour la mi-temps ? » (audit du 16/11). → Tranché le 17/11 : non, le mercato et la mi-temps seront plus courts.
- « Comment un style ajoute de petites caractéristiques » (13/11). → Tranché le 14/11 : bonus caché et comportement, sans contrepartie.
- « L'interrupteur « Styles » coupe les styles, pas les bonus de pays ni les fusions (à confirmer) » (14/11). → Sans objet : interrupteurs retirés le 15/11.
- Les paliers des styles. → Tranchés le 14/11 : 3 et 5.
- Budget et revente au mercato. → Budget 50 (13/11, 16/11) ; revente au prix d'achat moins 1 (14/11).
- Figurines aussi pendant le match, « plus tard » (12/11). → Vue Action, avec des figurines autour du ballon (13/11 et 15/11).
- « Équilibrage des fusions : reporté après le moteur ». → Fusions de copies tranchées le 14/11 ; impact à augmenter le 16/11 ; hybrides mis de côté.
- Adversaires en tournoi : équipes enregistrées d'autres joueurs, en différé (proposition de l'audit, §2.7). → Abandonné le 16/11 : tournoi en ligne en direct, complété par des IA.

## Ancienne section « État » (copie telle quelle, jusqu'au 17/11)

Historique détaillé : `journal.md` (par jour) et `docs/historique-etat.md` (anciennes entrées).

- **« État du moment » du 17/11 (nuit), remplacé le 17/11 après le découpage de `ballon.ts` (A1)** :
  - **Dernière étape livrée** (15/11) : le **1 contre 1 en ligne**, fusionné sur `main` avec l'accord du concepteur (pull request n° 13), site public en ligne, 187 tests verts. Lien partagé sur WhatsApp, 10 minutes chacun pour l'équipe, mi-temps calculées par le serveur Supabase, même film sur les deux téléphones. Reste : la première vraie partie sur deux téléphones.
  - **16/11** : audit en trois fichiers, dans le projet claude.ai. Ses décisions sont reportées dans `docs/`, et ses constats sur le code sont gardés tels quels (`decisions.md` §14).
  - **17/11** : ce fichier est réorganisé (prompt A4). Le code n'a pas changé.
  - **À juger par le concepteur en jouant** (aucun retour pour l'instant) : le déroulé du 1 contre 1 et ses marges (coup d'envoi, reprise) ; le rendu « M2 » et « P3 » et la **fluidité sur téléphone** ; la force des bonus, le bandeau et les éclats de style ; le stade et le changement de côté ; les montées des latéraux, les repiquages, la charnière ; l'équipe automatique, les sons, le premier écran ; les touches, le rythme du championnat, les +10 pièces ; les maillots anglais et allemands, le barème des notes de match, la fatigue visible à la mi-temps.
  - **Prochaine étape**, une conversation par prompt, dans l'ordre conseillé par l'audit (au choix du concepteur) : **A1** (découper `ballon.ts`, avant toute retouche du moteur) ; **B1** (essai d'une mi-temps de 30 s) ; **B2** (le mot de l'adjoint) et **B3** (une fusion plus forte) ; **A3** (serveur) avec **B5** (tournoi en ligne) ; **A2** (écran du match, quand la fluidité devient un sujet). Ensuite C1, C2 et D2 : le Club, les maquettes, le nom.
- **15/11 (midi et fin d'après-midi) : 1 contre 1 en ligne, de bout en bout** (187 tests verts ; **fusionné sur `main` le 15/11 à 17 h 51 avec l'accord du concepteur** (pull request n° 13) ; premier essai du concepteur sur le site public : « ça a l'air bien fonctionné »). Premier écran → « Créer une partie » → lien (WhatsApp, copier, partager) ; l'ami l'ouvre sans compte ; 10 min chacun pour l'équipe (chrono, « Prêt ») ; le serveur Supabase (fonction `partie`, en ligne) calcule chaque mi-temps et envoie le film (0,9 Mo) ; les deux téléphones le lisent à l'heure du serveur ; mi-temps d'1 minute avec changements ; chacun se voit en bleu, en bas. Partie entière jouée à deux navigateurs sur un serveur local (mêmes images, même score), et serveur Supabase vérifié depuis la base (création, lien, équipes, deux mi-temps calculées en moins d'1 s). **Site public en ligne depuis 17 h 45 : https://jayjayc501.github.io/FootMergTactic/** (version de la branche). Reste : la première vraie partie sur deux téléphones. Page claude.ai du prototype republiée après la fusion (le 1 contre 1 se joue depuis le site public ; dans la page claude.ai, l'accès au serveur peut être bloqué). Détail dans `journal.md`. **À juger : le déroulé, les marges avant le coup d'envoi et la reprise.** **Prochaine étape (nouvelle conversation)** : retours du concepteur après une vraie partie à deux ; ensuite, au choix du concepteur : fin de la revue des écrans (mi-temps, fin, journée suivante), hybrides, ou réglages du 1 contre 1. Pour republier le site après un changement : `prototype/scripts/publier-site.sh <clone de FootMergTactic>` ; pour le serveur : `prototype/serveur/README.md`.
- **15/11 (fin de matinée) : draft sans saut d'écran, bandeau des bonus au milieu, vrais sons, premier écran** (177 tests verts ; commit sur `main`). Sons ElevenLabs (`src/sons/`, workflow `foot-merge-sons.yml`) : ambiance qui monte près des buts, frappes, « ooh », clameur, sifflets. Premier écran : Championnat ou 1 contre 1 (« Bientôt »). Projet Supabase créé ; une mi-temps se calcule en 250 à 450 ms, film de 5,2 Mo (2,2 Mo compressé) : à alléger. **Prochaine étape (nouvelle conversation conseillée)** : le 1 contre 1 en ligne (salon par lien, 10 min pour l'équipe, arbitre serveur, film allégé), une fois l'accès à `FootMergTactic` donné. **À juger : sons, bandeau, premier écran.**
- **15/11 (matin) : écrans à la hauteur du téléphone** (177 tests verts ; commit sur `main`) : marges réduites, plateau et terrain qui rétrécissent selon la hauteur de l'écran (tout tient en 390 × 700), phrase d'état du match et ligne du mercato des ordinateurs retirées. **À juger : plus de défilement sur le téléphone.**
- **15/11 (nuit) : écrans épurés après la revue du concepteur** (177 tests verts ; commit sur `main`) : gros bouton « Jouer le match » à la place des onglets, encart des ordinateurs retiré ; en match, démarrage direct, vue Action seule, tactiques et son en haut, plus rien sous le terrain. Moteur inchangé. **Prochaines étapes** : finir la revue (mi-temps, fin, journée suivante) ; puis le **1 contre 1 en ligne** (choix du mode au lancement, salon par lien, 10 min pour l'équipe, arbitre serveur sur Supabase, film allégé, site sur le dépôt `FootMergTactic` une fois l'accès donné). Point à mesurer d'abord : temps de calcul d'une mi-temps face à la limite des fonctions Supabase (2 s de calcul par requête selon leur documentation).
- **14/11 (après-midi) : fusions et pictos de style en match refaits d'après les propositions visuelles choisies** (177 tests verts ; commit sur `main`) : fusions « M2 » (contour lumineux et étincelles, puis feu réaliste, puis grand feu avec braises), pictos « P3 » (dans le pion, plaque colorée sur le socle). Moteur inchangé. **À juger : le rendu en match et la fluidité sur le téléphone** (le feu réaliste est l'effet le plus coûteux).
- **14/11 (fin de matinée, suite) : crescendo des fusions, charnière centrale** (177 tests verts ; commit sur `main`). Halo au niveau 1, flamme au 2, grande flamme double et étincelles au 3 ; défenseurs centraux resserrés (15 m entre eux avec le ballon au lieu de 29, 16 m du latéral au lieu de 9). Revente des fusionnés : déjà cumulée (test ajouté). **À juger : la charnière en match, le crescendo.**
- **14/11 (midi) : halos de fusion visibles, fiche du mercato, prix de vente** (175 tests verts ; commit sur `main`). La fiche d'un joueur du mercato se refermait aussitôt au toucher (corrigé). Halos (niveau 1, le cas le plus courant) plus grands et plus lumineux ; flammes plus grandes et dessinées sans transformation SVG animée. Prix de vente = prix payé moins 1 (fiche et revente). **À juger : la visibilité des halos.** Carte à 1 pièce revendue 0 : validé (« et 0 pour l'instant »).
- **14/11 (fin de matinée) : équipe automatique** (174 tests verts ; commit sur `main`) : boutons « ★★★ Haute qualité » (note moyenne 75 à 76, paliers de pays et de style, fusions) et « ★★ Moyenne » (65 à 68) au début de la partie ; chaque appui donne une autre équipe. **À juger : les deux niveaux.**
- **14/11 (matin) : stade, flammes de fusion, changement de côté, latéraux et ailiers** (173 tests verts ; commit sur `main`). Stade avec tribunes, panneaux, filets et pelouse travaillée ; fusion en match = halo puis flamme qui grossit, aux couleurs de l'équipe (validé) ; terrain retourné en 2e mi-temps ; l'ordinateur fait jouer ses fusionnés (au 1er match, 7 adversaires sur 10 n'en ont encore aucun) ; latéraux qui montent (6,9 montées par équipe et par 180 s), ailiers qui repiquent et vont au second poteau (tirs des ailiers ×2,7). **À juger en jouant : le stade, la flamme, le changement de côté, la fréquence des montées et des repiquages.** Les mesures des bonus (nuit) n'ont pas été refaites après ce changement du moteur.
- **14/11 (nuit) : styles, pays et fusions refaits selon les décisions du concepteur** (170 tests verts ; commit sur `main`). Styles en bonus caché sans contrepartie, paliers à 3 et 5 (action signature), pays à 5 (cohésion) et 8 (tradition), fusions en boost de match caché (le joueur fusionné pèse plus dans le jeu), bandeau des bonus, pictogrammes de style qui jaillissent, flammes de fusion corrigées (un style CSS repeignait leur anneau en blanc ou en rouge sombre). Mesures (80 matchs par configuration, victoires de l'équipe avec le bonus ; 39 % sans bonus) : fusion ×3 49 %, styles à 3 de 39 à 48 %, à 5 de 43 à 54 %, cohésion à 5 45 % (14 % de défaites), pays à 8 de 56 à 63 %. Les 6 matchs témoins du moteur sont identiques au bit près. Détail dans `journal.md`. **À juger en jouant : la force des bonus, le bandeau, les éclats de style, les flammes.** Ensuite : les fusions de joueurs différents (hybrides), ou ce que le concepteur demandera après ses essais.
- **13/11 au soir : préparation du mode en ligne, sans rien changer au jeu** (161 tests verts ; **fusionné sur `main` le 13/11 à 22 h 20 avec l'accord du concepteur** (pull request n° 11), après 5 matchs de contre-vérification dans Chrome, tous identiques ; page habituelle du prototype republiée). Fournisseur de graines ; arbitre de match et film ; l'écran du match lit le film au lieu de faire avancer le moteur ; tactiques et interrupteurs grisés pendant le jeu (décision du concepteur). Preuves : empreintes identiques au bit près (6 matchs, une partie entière), et dans Chrome, mêmes panneaux de mi-temps et de fin que l'ancienne page. Détail dans `journal.md`. La page de test séparée (https://claude.ai/artifact/5AP8h49wchEwgmtjy8YR6a) n'est plus utile. Ensuite, comme prévu : les styles, puis les fusions.
- **Pour reprendre dans une nouvelle conversation (14/11 après-midi, point d'étape demandé par le concepteur)** :
  - **Où on en est** : une partie complète se joue dans le prototype : draft des 11 titulaires (budget 50, ou boutons d'équipe automatique « ★★★ Haute qualité » et « ★★ Moyenne »), premier mercato pour le banc, **championnat de 4 équipes** (toi, Tigres, Requins, Aigles ; 3 journées), match en deux mi-temps (terrain retourné en 2e), changements, places et fatigue à la mi-temps, note de match, mercato de +10 pièces avant la journée suivante. 60 cartes, 5 pays européens, un buste par carte. Styles, pays et fusions en **bonus cachés** avec paliers (styles à 3 et 5, pays à 5 et 8), bandeau et éclats de style. Stade, latéraux qui montent, ailiers qui repiquent, charnière centrale resserrée. Fusions et pictos de style en match au rendu choisi par le concepteur (« M2 » et « P3 »). 177 tests verts. Moteur et prototype à jour sur `main` et sur la page du prototype.
  - **À juger par le concepteur en jouant** (rien de tout cela n'est encore validé dans ses chiffres) : rendu « M2 » et « P3 » en match et **fluidité sur le téléphone** (le feu réaliste, filtre de turbulence, est l'effet le plus lourd ; à alléger si ça saccade) ; force des bonus de styles, de pays et de fusion ; bandeau et éclats de style ; stade ; changement de côté ; fréquence des montées des latéraux, des repiquages et du second poteau ; charnière centrale ; les deux niveaux d'équipe automatique. Toujours sans retour depuis le 13/11 : touches, rythme du championnat (3 journées), +10 pièces par journée, maillots anglais et allemands, barème des notes de match, fatigue visible à la mi-temps.
  - **Prochaine étape possible** : les **fusions de joueurs différents (hybrides)**, pas encore faites (voir « Questions ouvertes » : postes, style et nom de l'hybride, palier de pays) ; ou ce que le concepteur demandera après ses essais.
  - **Façon de faire qui a marché (14/11)** : pour un changement visuel contesté, montrer d'abord **plusieurs propositions** sur une page Design (page du 14/11 : https://claude.ai/artifact/2CKAhmJXogvSfgW8VYV5Bg), puis n'intégrer que le choix du concepteur. Pour vérifier un rendu de fusion sans attendre un vrai joueur fusionné, faire une copie de `dist/index.html` où le niveau de fusion est forcé selon l'identifiant du joueur (journal du 14/11 après-midi).
  - **Visuels à reprendre un jour** : quelques bustes refaits à part sont un peu plus petits que les autres (Cartwright, Steinbach) ; un buste italien a les cheveux flous. Kling : environ 96 crédits dépensés sur 375 ; un joueur raté sur une planche se refait seul (image 1:1 en 2K, 2 crédits ; la ligne de `a-telecharger.txt` porte l'identifiant de la carte).
  - **Vérifier un parcours au téléphone** : `prototype/scripts/capture/` (voir son `README.md` : draft, match complet, championnat entier, planche des bustes).
- **Prototype 1** (web, `prototype/`, 93 tests verts) : plateau en hexagones, projection v4 (lignes, transitions, réactions individuelles), **ballon réel** (passes, tirs, centres, dribbles, interceptions, contres, pressing et contre-pressing, gardien qui plonge, hors-jeu, fautes, penalty, corners, touches, six mètres, engagement), sons et annonces. Lien : https://claude.ai/artifact/B86yGS9jR47LwubdEiL5EN
- **12/11 : moteur jugé satisfaisant pour ce stade** par le concepteur. Interface traitée le 12/11 (voir plus bas) ; **ensuite : les styles** (les notes des joueurs viendront après : la réussite des passes, des tirs, des arrêts en dépendra).
- Limites connues du moteur : encore trop de changements de camp ; presque pas de hors-jeu ; aucune qualité individuelle (tous les joueurs passent et tirent pareil) ; appels et soutien encore simples (12/11) ; on court encore trop (3,9 m/s en moyenne, vrai football environ 2) ; encore 5,4 changements de camp par minute (vrai : 2 à 4), les passes ratées en tête des pertes.
- Règle de séance (concepteur, 12/11) : **économiser les tokens** : peu de lectures, peu de tests et de captures, le concepteur valide lui-même ; mettre à jour le projet claude.ai seulement aux grandes étapes ; réponses courtes ; une conversation par sujet.
- **12/11 (interface)** : maquette de l'écran de préparation (bustes, couleurs par pays, fusions en couleurs) : https://claude.ai/artifact/67QRVRz7Fd6f8YWD9gHPq4. Décisions dans « Interface (séance du 12/11) ».
- **12/11 : écran de préparation intégré au prototype** (moteur inchangé, 93 tests verts) : bustes, hors poste refusé, banc de 5, mercato (achat, fusion automatique, vente au glisser). Données dans `src/data/preparation.json`. Chrono et classement fixes ; budget, prix et revente provisoires ; achats non gardés au rechargement. Pelouse rayée avec tracé complet (le vert pâle « ne faisait pas terrain de foot »).
- **12/11 : tactiques et styles dans le moteur** (100 tests verts), avec commandes de comparaison sur l'écran du match. **À valider par le concepteur en regardant des matchs** ; ensuite : réglages fins, puis notes des joueurs.
- **12/11 au soir : travail sur le moteur mis en pause par le concepteur** (« ça prend forme mais pas totalement » ; restent : trop de course, encore du va-et-vient). **Prochaine étape : les cartes et les caractéristiques des joueurs, dans une nouvelle conversation.** Pour brancher les caractéristiques sur le moteur, les points d'entrée existent déjà : `EffetJoueur` (`src/sim/influences.ts` : vitesse, pressing, tacle, fautes, imprécision des passes, dribble, protection), aujourd'hui rempli par les styles (coupés en match) ; `JoueurSim.facteur` (± 6 % de vitesse et d'accélération, en attendant l'attribut « vitesse ») ; dans `reglages.json` → `ballon`, la précision des tirs (`tir.erreurBaseM`, `erreurParMetre`), les arrêts du gardien (`tir.arretMax`, `arretMin`), le contrôle sous pression (`gene.controleRate`). Questions ouvertes à traiter : liste des attributs, notes et niveaux des cartes, couleurs de niveau (en pause), effets chiffrés des styles, fusions.
- **13/11 midi** (134 tests verts) : pays européens (Angleterre et Allemagne à la place du Brésil et de l'Argentine, 24 nouveaux bustes), touches corrigées (lob vers un partenaire démarqué, plus de double touche), **championnat de 4 équipes** sur 3 journées avec classement, résultats et un mercato de +10 pièces après chaque journée. **À juger : les touches, le rythme du championnat, les +10 pièces, les nouveaux maillots.** Ensuite : les styles (à discuter), puis les fusions.
- **13/11 fin de matinée** (130 tests verts) : budget 50, mi-temps (changements, places, forme), note de match, 60 bustes Kling tous différents avec le drapeau du pays (environ 70 crédits Kling dépensés). **À juger : barème des notes, fatigue visible à la mi-temps, bustes.** Ensuite : les styles (à discuter), puis les fusions.
- **13/11 au matin : retours du concepteur traités** (126 tests verts) : notes du gardien (4 notes simples), draft en un toucher, budget 40 et offres avec une vedette, fusions et styles visibles en match, styles actifs, engagement depuis les places de coup d'envoi, écran de préparation sur une page, ordinateur qui garde de quoi faire son banc. Détail dans `journal.md`. **À discuter : comment les styles ajoutent des caractéristiques.** Ensuite : les fusions.
- **13/11 : partie jouable contre l'ordinateur** (122 tests verts) : draft des 11 titulaires (case → 4 joueurs, budget 30), premier mercato pour le banc (relance à 1 pièce), match « Toi » contre « Ordinateur » ; l'ordinateur drafte dans la même réserve avec le même budget. Règles en PROPOSITION dans `src/data/partie.json`, code dans `src/jeu/partie.ts`, détail dans `journal.md`. Bustes provisoires (ceux de la maquette, partagés entre plusieurs joueurs). **Prochaine étape : les fusions** (le bonus de +4 par niveau n'est qu'une proposition ; hybrides pas encore faits).
- **13/11 dans la nuit : mercato au toucher (fiche) et à l'appui long (glisser pour recruter), vue Action plus fluide, buteurs** (115 tests verts). Le concepteur juge l'ensemble « pas mal ». **Prochaines étapes demandées : le plan global des cartes (pays, liste de toutes les cartes, noms, valeurs, hasard des cartes, budget initial, tout le monde a accès à tous les joueurs), le draft de début de tournoi (titulaires et remplaçants, avec budget ; voir « Deck, mercato et traits »), puis les fusions.** Proposition de Claude (13/11, non validée) : 8 pays de 16 joueurs (128 cartes), prix de 1 à 5 pièces selon la note, réserve commune à copies limitées, budget de draft d'environ 30 pièces pour 16 joueurs.
- **12/11 dans la nuit : fatigue, vitesse, buts, pauses, fiche joueur** (113 tests verts). 2,4 buts par match. **À juger par le concepteur** : nombre de buts, poids des notes (80 contre 65 gagne 9 fois sur 10), fiche.
- **12/11 au soir : notes des joueurs dans le moteur** (112 tests verts) : 4 notes validées, 8 sous-notes branchées (endurance sans effet pour l'instant, gardien sans notes). Chiffres en PROPOSITION, mesures dans `journal.md`. **À juger par le concepteur en regardant des matchs.**
- (Avant :) **Prochaine étape (12/11) : les styles**, dans une nouvelle conversation. Décisions dans « Deck, mercato et traits » (4 styles : Récupérateur, Technicien, Rapide, Rempart ; joueurs sans style possibles ; tactique d'équipe séparée ; pas de style de gardien ; pas de notes pour l'instant) ; proposition de départ dans « Traits ».
