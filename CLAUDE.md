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

- projets/shorts-mythologie — Shorts YouTube pour la chaîne « La Pause Mytho…logique » (Kling + ElevenLabs + montage ffmpeg) — en cours (Short Odin terminé en 4K ; Short Naglfar/Loki monté en 4K, à valider ; utiliser monter2.py, lire projets/shorts-mythologie/METHODE.md avant tout nouveau Short)
- projets/jetelavaisdit — App mobile « Je te l'avais dit » : sceller une phrase datée et l'envoyer plus tard avec une carte d'authenticité — en cours (APK Android testé ; 17/11 : base mutualisée, tout en `jtlad_`, script SQL appliqué et pull request #16 fusionnée (avec #7 et #12) ; nouvel APK à installer et vérifier ; lire d'abord `projets/jetelavaisdit/CONTEXTE.md`)
- projets/foot-merge-tactic — Jeu de football mobile : cartes, fusions de joueurs et matchs tactiques simulés ; priorité au moteur de match (contexte dans son `CLAUDE.md`, décisions dans `docs/decisions.md` ; pour toute modification du prototype, suivre le skill `foot-merge-tactic-etape`) — en cours (1 contre 1 en ligne depuis le 15/11 : https://jayjayc501.github.io/FootMergTactic/ ; audit du 16/11 ; 17/11 : mémoire du projet allégée, puis moteur du ballon découpé en modules sans changer un match, pull request n° 14 fusionnée le 17/11, son rétabli dans la page claude.ai ; A3 (ménage du serveur) mis de côté, l'historique est à garder ; prochaine étape A2 (écran du match) ; état détaillé et prochaine étape dans le `CLAUDE.md` du projet)
- myflix (dépôt séparé jayjayc501/MyFlix) — Lecteur de listes M3U façon plateforme de streaming pour télé Samsung (Tizen), Android et web : profils, propositions, direct avec guide, films, séries (contexte dans le `CLAUDE.md` du dépôt) — en cours (15/11 au soir : première version complète testée en navigateur, format télé et téléphone ; fabrication automatique de l'APK et du .wgt sur GitHub ; 15/11 à 23 h 30 : v0.2.0 (API Xtream, chargement suivi) validée sur le vrai téléphone Android ; reste à essayer sur la télé Samsung ; 16/11 : décision d'en rester à un usage personnel (pas de Google Play), options iPhone et idées (compte en ligne, préférences, IA) notées dans le `CLAUDE.md` du dépôt MyFlix et dans le projet claude.ai « MyFlix » ; 17/11 (v0.3.0) : compte en ligne Supabase (liste M3U/Xtream, réglages, profils, historique côté serveur, télé connectée par code validé au téléphone), tables `myflix_` dans le projet Supabase partagé `jelavaisdit`, pull request n° 1 fusionnée le 17/11 à 9 h 40, APK et .wgt v0.3.0 publiés ; à essayer sur le téléphone puis la télé ; 17/11 midi (v0.4.0) : goûts de chaque profil (questionnaire sports/équipes + séries et films connus à noter Pas vu / Pas aimé / J'aime / J'adore), propositions et rangée « Sport pour toi » d'après le guide, pull request n° 2 fusionnée et publiée le 17/11 à 12 h 25 ; à installer sur le téléphone, se connecter, remplir les goûts, puis essayer sur la télé)
