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

## Projets en cours

Ajouter ici une ligne par projet :
`- projets/<nom> — description courte — état (en cours / terminé)`

- projets/shorts-mythologie — Shorts YouTube pour la chaîne « La Pause Mytho…logique » (Kling + ElevenLabs + montage ffmpeg) — en cours (Short Odin terminé en 4K ; Short Naglfar/Loki monté en 4K, à valider ; utiliser monter2.py, lire projets/shorts-mythologie/METHODE.md avant tout nouveau Short)
- projets/jetelavaisdit — App mobile « Je te l'avais dit » : sceller une phrase datée et l'envoyer plus tard avec une carte d'authenticité — en cours (prototype en ligne en version web : https://jayjayc501.github.io/Claude/app/ ; à tester)
- projets/foot-merge-tactic — Jeu de football mobile : cartes, fusions de joueurs et matchs tactiques simulés ; priorité au moteur de match (contexte dans son `CLAUDE.md` ; pour toute modification du prototype, suivre le skill `foot-merge-tactic-etape`) — en cours (prototype 1 web : placement en hexagones, moteur avec ballon réel jugé satisfaisant le 12/11 ; écran de préparation de la maquette intégré le 12/11 ; 12/11 soir : moteur mis en pause (mouvements, tactiques, vue « Action ») ; 4 notes des joueurs (8 sous-notes) dans le moteur, fatigue, vitesse renforcée, 2,4 buts par match, fiche joueur, mercato au toucher et à l'appui long, buteurs ; 13/11 : partie jouable contre l'ordinateur (60 cartes avec chacune son buste, draft, mercato, match, mi-temps avec changements et fatigue, note de match) ; 13/11 midi : pays européens (Angleterre et Allemagne à la place du Brésil et de l'Argentine), touches corrigées, championnat de 4 équipes avec +10 pièces de mercato par journée ; 13/11 au soir : préparation du mode en ligne sans rien changer au jeu (graine, arbitre de match et film), fusionné sur `main` le 13/11 au soir avec l'accord du propriétaire ; 14/11 : styles en bonus caché, paliers de style à 3 et 5, de pays à 5 et 8, fusions en boost de match caché, bandeau et éclats de style, flammes de fusion visibles ; 14/11 matin : stade (tribunes, panneaux, filets), fusion en match = halo puis flamme aux couleurs de l'équipe, changement de côté à la mi-temps, l'ordinateur fait jouer ses fusionnés, latéraux qui montent et ailiers qui repiquent ; boutons d'équipe automatique, haute qualité ou moyenne ; 14/11 après-midi : fusions et pictos de style en match choisis sur propositions visuelles (fusions « M2 » : contour lumineux, puis feu réaliste, puis grand feu ; pictos « P3 » dans le pion et sur le socle) ; 15/11 : écrans épurés après revue (gros bouton « Jouer le match », match qui démarre seul, vue Action seule) ; 15/11 fin de matinée : vrais sons (ElevenLabs) avec ambiance qui suit le ballon, bandeau des bonus au milieu avant l'engagement, premier écran avec choix du mode, projet Supabase créé ; 15/11 : 1 contre 1 en ligne, fusionné sur `main` le 15/11 au soir (pull request n° 13) : lien WhatsApp, 10 min pour l'équipe, match calculé par la fonction Supabase `partie` (en ligne), regardé en même temps sur les deux téléphones ; site public en ligne le 15/11 au soir : https://jayjayc501.github.io/FootMergTactic/ (dépôt séparé FootMergTactic) ; premier essai concluant ; prochaine étape : retours du concepteur après une vraie partie à deux)
- myflix (dépôt séparé jayjayc501/MyFlix) — Lecteur de listes M3U façon plateforme de streaming pour télé Samsung (Tizen), Android et web : profils, propositions, direct avec guide, films, séries (contexte dans le `CLAUDE.md` du dépôt) — en cours (15/11 au soir : première version complète testée en navigateur, format télé et téléphone ; fabrication automatique de l'APK et du .wgt sur GitHub ; 15/11 à 23 h 30 : v0.2.0 (API Xtream, chargement suivi) validée sur le vrai téléphone Android ; reste à essayer sur la télé Samsung)
