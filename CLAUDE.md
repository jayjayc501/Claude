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
  = base **mutualisée** entre toutes les applis (« Je te l'avais dit », MyFlix, projets à venir) :
  chaque appli préfixe ses tables, ses fonctions SQL et ses fonctions Edge, aucune table sans préfixe.
  - `jtlad_…` : « Je te l'avais dit » (`jtlad_profils`, `jtlad_phrases`, `jtlad_moderation_mots`, fonctions `jtlad_…`).
  - `myflix_…` / `myflix-…` : MyFlix.
  - Nouvelle appli : choisir un préfixe court et ne jamais toucher aux objets des autres préfixes.
  - Les comptes (`auth.users`) sont communs : un même compte Google sert partout. Les déclencheurs
    sur `auth.users` touchent toutes les applis (celui de « Je te l'avais dit » crée une ligne
    `jtlad_profils` à chaque inscription, même venue de MyFlix).
  - `auth.users` n'appartient pas au rôle `postgres` : on peut y créer un déclencheur mais pas le renommer
    ni le supprimer ensuite → le nommer avec le préfixe de l'appli dès sa création. Exceptions historiques :
    `profil_a_l_inscription` et `noms_a_la_connexion` sont à « Je te l'avais dit ».
- Projet `foot-merge-tactic` : jeu Foot Merge Tactic.

## Projets en cours

Ajouter ici une ligne par projet :
`- projets/<nom> — description courte — état (en cours / terminé)`

- notes/idees-applis — Page des idées d'applis classées (notes, concurrence, comment les rentabiliser), en ligne sur https://jayjayc501.github.io/Claude/idees-applis/ et copiée sur claude.ai ; mise en ligne par le workflow `jetelavaisdit.yml` (un seul site Pages par dépôt) ; tenir les deux copies à jour ; à chaque ajout, mettre en évidence le nouveau lot (règles dans son README) — en cours (54 idées le 20/11)
- projets/shorts-mythologie — Shorts YouTube pour la chaîne « La Pause Mytho…logique » (Kling + ElevenLabs + montage ffmpeg) — en cours (Short Odin terminé en 4K ; Short Naglfar/Loki monté en 4K, à valider ; utiliser monter2.py, lire projets/shorts-mythologie/METHODE.md avant tout nouveau Short)
- projets/jetelavaisdit — App mobile « Je te l'avais dit » : sceller une phrase datée et l'envoyer plus tard avec une carte d'authenticité — en cours (APK Android testé ; 17/11 : base mutualisée, tout en `jtlad_`, script SQL appliqué et pull request #16 fusionnée (avec #7 et #12) ; nouvel APK à installer et vérifier ; 19/11 : maquettes v2 validées (« à qui » = case + texte libre, signature au doigt sur « C'est scellé », « certitude », plus de limite par jour) et codées (pull request n° 17), script SQL appliqué sur la base et pull request fusionnée le 19/11, version web en ligne, APK prêt (lien dans le CONTEXTE.md du projet) : à installer et tester ; avec ce propriétaire : maquettes d'abord, pas de code avant sa validation ; lire d'abord `projets/jetelavaisdit/CONTEXTE.md`)
- projets/foot-merge-tactic — Jeu de football mobile : cartes, fusions de joueurs et matchs tactiques simulés ; priorité au moteur de match (contexte dans son `CLAUDE.md`, décisions dans `docs/decisions.md` ; pour toute modification du prototype, suivre le skill `foot-merge-tactic-etape`) — en cours (1 contre 1 en ligne depuis le 15/11 : https://jayjayc501.github.io/FootMergTactic/ ; audit du 16/11 ; 17/11 : mémoire du projet allégée, puis moteur du ballon découpé en modules sans changer un match, pull request n° 14 fusionnée le 17/11, son rétabli dans la page claude.ai ; A3 (ménage du serveur) mis de côté, l'historique est à garder ; prochaine étape A2 (écran du match) ; état détaillé et prochaine étape dans le `CLAUDE.md` du projet)
- myflix (dépôt séparé et **privé** jayjayc501/MyFlix) — Lecteur de listes M3U/Xtream façon plateforme de streaming pour télé Samsung (Tizen), Android et web : profils, propositions (goûts par questionnaire, français d'abord), direct avec guide, films, séries, sauvegarde en ligne sans email (Supabase `claude_projets`, tables `myflix_`) ; contexte détaillé et historique dans le `CLAUDE.md` du dépôt MyFlix — en cours (v0.5.0 du 17/11 validée le soir même sur le vrai téléphone Android et la télé Samsung du propriétaire (Tizen 6.0) : installée depuis le téléphone avec Apps2Samsung, télé reliée au compte par code, liste Xtream récupérée ; usage familial seulement, pas de Google Play ; 18/11 au soir : v0.5.1 (pull request n° 5) = lecteur en paysage plein écran sur le téléphone (module Android natif) et point de lecture sélectionnable à la télécommande avec déplacement qui accélère ; 19/11 : v0.5.2 (pull request n° 6) = point de lecture à faire glisser au doigt sur le téléphone ; 20/11 : v0.5.3 (pull request n° 7) = plus de point blanc (curseur de la télé) au milieu de l'écran, à confirmer ; à essayer sur les vrais appareils ; prochaines idées dans le `CLAUDE.md` du dépôt : « Connecter un appareil » plus visible, note après chaque film, propositions selon le moment, IA en option)
