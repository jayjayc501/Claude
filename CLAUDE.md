# Instructions pour Claude

Ce fichier est lu au début de chaque session. Il sert de mémoire au dépôt :
mets-le à jour quand quelque chose d'important change.

## À propos du propriétaire

- Compte GitHub : jayjayc501
- Langue : français. Réponses, commentaires de code et messages de commit en français.
- Fuseau horaire : Europe/Paris.

## Organisation du dépôt

- `projets/<nom>/` : un dossier par projet, avec un `README.md` qui explique
  ce que fait le projet et comment le lancer.
- `notes/` : idées, recherches, brouillons.

## Façon de travailler

- Petits changements ou fichiers nouveaux : commit direct sur `main`, c'est OK.
- Changements importants ou modification de code existant : travailler sur une
  branche et ouvrir une pull request pour relecture.
  Exception : le prototype `projets/foot-merge-tactic/prototype` est en phase de
  réglages grossiers, Claude committe et fusionne directement sur `main`
  (accord du propriétaire, 11/11/2026), en testant avant.
- Tester le code avant de le committer quand c'est possible.
- Messages de commit courts et clairs, en français.
- Ne jamais committer de mots de passe, clés d'API ou autres secrets.
- Travail créatif (vidéos, images, voix) : être exigeant, faire soi-même plusieurs
  essais et montrer un résultat abouti plutôt que demander son avis à chaque étape.
  Faire valider seulement les étapes clés (script, voix, rendu final).

## Supabase (offre gratuite : 2 projets actifs au maximum)

- Projet `claude_projets` (ex-`jelavaisdit` ; identifiant `joqzrjjgrntbyutytpnr`, l'URL ne change pas)
  = base **mutualisée** (aujourd'hui MyFlix seul ; « Je te l'avais dit » en est parti le 22/11) :
  chaque appli préfixe ses tables, ses fonctions SQL et ses fonctions Edge, aucune table sans préfixe.
  - `myflix_…` / `myflix-…` : MyFlix.
  - Nouvelle appli : choisir un préfixe court et ne jamais toucher aux objets des autres préfixes.
  - Les comptes (`auth.users`) sont communs : un même compte Google sert partout. Un déclencheur
    sur `auth.users` touche toutes les applis (aucun depuis le 22/11).
  - `auth.users` n'appartient pas au rôle `postgres` : on peut y créer un déclencheur et le supprimer
    (vérifié le 22/11), mais pas le renommer → le nommer avec le préfixe de l'appli dès sa création.
- Projet `foot-merge-tactic` : jeu Foot Merge Tactic.
- « Je te l'avais dit » est passé sur Cloudflare le 22/11/2026 (voir le dépôt jetelavaisdit) : ses objets `jtlad_`
  (tables, fonctions, déclencheurs de `auth.users`) ont été **supprimés de `claude_projets` le 22/11**, sans copie, à la
  demande du propriétaire (migration `jtlad_suppression`) ; MyFlix vérifié intact. Les nouvelles applis vont sur Cloudflare (une base D1 et un client
  Google par appli, connexion par le module commun `app-modules`), plus dans cette base mutualisée.

## Projets en cours

Ajouter ici une ligne par projet :
`- projets/<nom> — description courte — état (en cours / terminé)`

- notes/idees-applis — Page des idées d'applis classées (notes, concurrence, comment les rentabiliser), en ligne sur https://jayjayc501.github.io/Claude/idees-applis/ et copiée sur claude.ai ; mise en ligne par le workflow `pages.yml` (un seul site Pages par dépôt ; c'est la seule page qui y reste depuis le 22/11) ; tenir les deux copies à jour ; à chaque ajout, mettre en évidence le nouveau lot (règles dans son README) — en cours (57 idées le 22/11 ; **révision complète des notes le 22/11** avec une grille plus stricte (affichée en bas de la page ; chaque fiche a son ancien total `was` et sa raison `rev`) : 29 baisses, 2 hausses ; n° 1 : moments entre potes (14, modèle gratuit avec une pub de 15 s au lancement de chaque activité sur chaque téléphone + pass sans pub, idée du propriétaire le 22/11 au soir), à égalité avec l'album de vignettes du club (14), puis caution (13,5) ; frais réels tombé à 12 (le site des impôts calcule déjà) ; chaque fiche a aussi son potentiel de pub (`pub`, selon l'usage et la cible ; demande du propriétaire, la pub n'est pas toujours un bonus) ; « Ma tournée d'anniversaire » revue à 12,5 le 22/11 (le propriétaire la trouve peu rentable : rester franc sur l'argent) ; favori : « L'appli des moments entre potes », credo « Tous les moments entre potes deviennent un jeu », qui réunit soirée-jeu, soirée télé, Noël, concours de dîners, week-end télé-réalité et jeu de cartes de la bande ; premier module proposé : soirée télé pour Miss France le 12/12, maquettes d'abord ; le propriétaire préfère les idées festives aux sujets administratifs)
- projets/shorts-mythologie — Shorts YouTube pour la chaîne « La Pause Mytho…logique » (Kling + ElevenLabs + montage ffmpeg) — en cours (Short Odin terminé en 4K ; Short Naglfar/Loki monté en 4K, à valider ; utiliser monter2.py, lire projets/shorts-mythologie/METHODE.md avant tout nouveau Short)
- jetelavaisdit (dépôt séparé et **privé** jayjayc501/jetelavaisdit, historique repris) — App mobile « Je te l'avais dit » : sceller une phrase datée et l'envoyer plus tard avec une carte d'authenticité — en cours (**entièrement sur Cloudflare depuis le 22/11/2026**, validé par le propriétaire le 23/11 : serveur, connexion Google, carte reçue et version web sur https://jetelavaisdit.jayjayc501.workers.dev (`/app/`, `/carte?c=…`) ; une seule appli Android (l'appli de test est retirée) avec profil (prénom / nom) et « Où ? » facultatif ; carte reçue avec « Installer sur Android » / « Continuer sur le site » ; Supabase vidé de ses objets `jtlad_`, plus rien sur GitHub Pages (les anciens liens github.io ne marchent plus) ; 23/11 : boutons d'action toujours visibles sur petit écran (S23) et signature à valider ou annuler avant de quitter « C'est scellé » (pull request n° 5 fusionnée, nouvel APK) ; 23/11 après-midi : **dictée de la certitude au micro** dans l'appli (bouton « Dicter », pas d'enregistrement de la voix ; pull request n° 6 fusionnée le 23/11 vers 18 h, son APK posé derrière « Installer sur Android ») ; 24/11 : **étape 1 avant un lancement public** (pull request n° 7 fusionnée : « Signaler » vers l'adresse du propriétaire, vérification des types bloquante, sauvegarde hebdomadaire de la base, APK refabriqué tout seul tous les 10 jours ; étape 2 = supprimer son compte (cartes envoyées comprises) + pages légales `/conditions` et `/confidentialite` (15 ans, nom du propriétaire jamais publié) : maquettes validées et code fait le 24/11, pull request n° 8 ouverte, APK d'essai à tester avant « fusionne » ; étape 3 = modération IA + Play Store ; Cloudflare R2 mis de côté, à reproposer à la fin) ; à surveiller : lien Expo de l'APK à renouveler avant le ~7/12 ; contexte détaillé dans le `CLAUDE.md` et le `CONTEXTE.md` du dépôt jetelavaisdit)
- projets/foot-merge-tactic — Jeu de football mobile : cartes, fusions de joueurs et matchs tactiques simulés ; priorité au moteur de match (contexte dans son `CLAUDE.md`, décisions dans `docs/decisions.md` ; pour toute modification du prototype, suivre le skill `foot-merge-tactic-etape`) — en cours (1 contre 1 en ligne depuis le 15/11 : https://jayjayc501.github.io/FootMergTactic/ ; audit du 16/11 ; 17/11 : mémoire du projet allégée, puis moteur du ballon découpé en modules sans changer un match, pull request n° 14 fusionnée le 17/11, son rétabli dans la page claude.ai ; A3 (ménage du serveur) mis de côté, l'historique est à garder ; prochaine étape A2 (écran du match) ; état détaillé et prochaine étape dans le `CLAUDE.md` du projet)
- myflix (dépôt séparé et **privé** jayjayc501/MyFlix) — Lecteur de listes M3U/Xtream façon plateforme de streaming pour télé Samsung (Tizen), Android et web : profils, propositions (goûts par questionnaire, français d'abord), direct avec guide, films, séries, sauvegarde en ligne sans email (Supabase `claude_projets`, tables `myflix_`) ; contexte détaillé et historique dans le `CLAUDE.md` du dépôt MyFlix — en cours (v0.5.0 du 17/11 validée le soir même sur le vrai téléphone Android et la télé Samsung du propriétaire (Tizen 6.0) : installée depuis le téléphone avec Apps2Samsung, télé reliée au compte par code, liste Xtream récupérée ; usage familial seulement, pas de Google Play ; 18/11 au soir : v0.5.1 (pull request n° 5) = lecteur en paysage plein écran sur le téléphone (module Android natif) et point de lecture sélectionnable à la télécommande avec déplacement qui accélère ; 19/11 : v0.5.2 (pull request n° 6) = point de lecture à faire glisser au doigt sur le téléphone ; 20/11 : pavé blanc au milieu des films sur la télé réglé en v0.5.5 (pull request n° 9, la télé le dessinait au centre de l'objet `avplayer`), **confirmé sur la télé le 21/11** ; leçon : pour un bug visible seulement sur un appareil du propriétaire, demander tout de suite une courte vidéo ; paysage plein écran du téléphone confirmé le 21/11, point de lecture au doigt pas encore essayé ; rien en cours ; prochaines idées dans le `CLAUDE.md` du dépôt : « Connecter un appareil » plus visible, note après chaque film, propositions selon le moment, IA en option)
