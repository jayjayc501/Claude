# Foot Merge Tactic (titre de travail) — contexte de Claude

Ce fichier est lu au début de chaque séance. Il est volontairement court ; le détail est dans `docs/`. Il a été réorganisé le 17/11/2026 (prompt A4 de l'audit du 16/11). L'ancienne version de 442 lignes se retrouve dans git (commit `9885b08`), et ce qu'elle contenait de remplacé est dans `docs/historique-etat.md`.

## Où se trouve quoi

- **Le dépôt est la version de référence** : `jayjayc501/Claude`, dossier `projets/foot-merge-tactic/`. Pour écrire du code, ajouter le dépôt à la session et suivre son `CLAUDE.md`, à la racine et ici.
- `docs/decisions.md` : les décisions **[VALIDÉ]** en vigueur, classées par thème. À lire avant toute discussion de conception.
- `docs/propositions.md` : les **[PROPOSITION]** en cours (moteur, rendu, réglages), avec leurs chiffres.
- `docs/questions-ouvertes.md` : les **[OUVERT]** et les points de vigilance.
- `docs/historique-etat.md` : ce qui a été remplacé, et les anciens « État ». À ne lire que pour retrouver une ancienne version.
- `docs/dossier-conception.md` : le dossier de conception du 11/11, complété le même jour par son §20. **En cas de contradiction, les décisions datées de `docs/decisions.md` priment sur le dossier** (concepteur, 17/11) : par exemple, une mi-temps de 30 s et non de 10 s, et 5 pays par match. Le dossier reste la référence pour tout ce qui n'a pas été décidé depuis, son §20 primant sur ses sections plus anciennes. En cas de doute, demander au concepteur.
- `docs/reference-football.md` : vocabulaire, principes tactiques, rôles, chiffres et tests de réalisme. **À relire avant de modifier un comportement du moteur** : §7 pour les chiffres, §9.4 pour les tests. Le concepteur l'a demandée pour que le moteur ne s'éloigne pas du vrai football.
- `journal.md` : ce qui a été fait, séance par séance. Ne lire que les dernières entrées.
- **Projet claude.ai « App Foot Merge Tactic »** : copies de ce fichier (`claude/contexte-foot-merge-tactic.md`), de `decisions.md`, `propositions.md`, `questions-ouvertes.md`, du dossier et de la référence football, plus les trois fichiers de l'audit du 16/11 (`claude/audit-1…`, `audit-2…`, `audit-3…`).
- **Pages claude.ai** : prototype https://claude.ai/artifact/B86yGS9jR47LwubdEiL5EN (**toujours republier cette même page** ; privée au concepteur tant qu'il ne la partage pas) ; tableau des 60 cartes https://claude.ai/artifact/96ui2NMXpZ5QYYxvU4rpJF ; maquette de la préparation https://claude.ai/artifact/67QRVRz7Fd6f8YWD9gHPq4.
- **En ligne** : le jeu sur https://jayjayc501.github.io/FootMergTactic/ (dépôt `FootMergTactic`) ; le serveur, projet Supabase `foot-merge-tactic` (id `jcbqeoyygozmtixlorvf`).

## Règle d'or : trois statuts à ne jamais mélanger

- **[VALIDÉ]** : décidé par le concepteur. À respecter.
- **[PROPOSITION]** : piste technique ou de design. À tester, jamais à coder comme une vérité.
- **[OUVERT]** : pas encore décidé. Signaler le point et proposer des options argumentées, sans rien inventer.

Une proposition ne devient une règle qu'après validation explicite du concepteur.

## Le jeu en bref

Jeu de football mobile. Le joueur est **entraîneur** : il ne contrôle pas les footballeurs. Avant un tournoi, il choisit ses pays : 5 par match, décision du 16/11 ; dans le prototype, les mêmes 5 pays pour tous. Pendant le tournoi, il recrute des joueurs fictifs (des cartes) au draft puis au mercato, les fusionne et les place sur un demi-terrain, aux positions de coup d'envoi. Il regarde ensuite un moteur simuler le match en vue du dessus, comme le moteur 2D de Football Manager. L'idée de fusion s'inspire du mode Merge Tactics de Clash Royale.

Principe directeur : *une meilleure équipe donne un avantage ; un meilleur entraîneur doit pouvoir faire la différence.* Ni la note globale des cartes ni le hasard ne doivent décider seuls du résultat.

**Priorité absolue : le moteur de match.** Les cartes, la collection, les fusions, les tournois et la progression passent après. Le moteur doit donner l'impression d'une équipe qui joue au football, pas de pions qui bougent sur un plateau.

## Façon de travailler

- **Pour toute modification du prototype** (moteur, écrans, cartes, réglages), suivre le skill `foot-merge-tactic-etape` : lecture ciblée, tests, mesures avant et après, captures au format téléphone, journal, commit, republication.
- **Discussion de conception sans code** : répondre à partir de `docs/decisions.md` et du dossier, en disant toujours si un point est validé, proposé ou ouvert.
- **Une décision validée ou un plan qui change** : l'écrire dans `docs/decisions.md` (date, mots du concepteur) et déplacer ce qu'elle remplace dans `docs/historique-etat.md` ; mettre à jour `questions-ouvertes.md` et `propositions.md` ; **recopier dans le projet claude.ai**, sinon les autres discussions travaillent sur un contexte périmé.
- **Règle de séance** (concepteur, 12/11) : **économiser les tokens**. Peu de lectures, peu de tests et de captures, le concepteur valide lui-même ; projet claude.ai mis à jour seulement aux grandes étapes ; réponses courtes ; une conversation par sujet.
- **Commits** : pendant les réglages grossiers, commit direct sur `main`, sans demande de fusion (accord du concepteur, 11/11). Les gros lots passent par une branche et une pull request : le 1 contre 1 en ligne le 15/11, les découpages et le serveur de l'audit.
- **Changement visuel contesté** : montrer d'abord plusieurs propositions sur une page Design, puis n'intégrer que le choix du concepteur (14/11).

**Règles du dossier** (§16), condensées :
1. Étapes courtes et validables. Jamais le jeu complet d'un coup.
2. Commencer par le terrain, les postes, les rectangles et les sous-zones.
3. Ne jamais remplacer les rectangles fixes par un placement entièrement libre.
4. Respecter les chevauchements, le délai de transition (dans le mouvement automatique du bloc) et les postes naturels. N'imposer aucune formation rigide. Une seule organisation pour l'instant : ne pas réintroduire les deux organisations sans décision du concepteur.
5. Séparer simulation, IA, données et rendu.
6. Des tests à chaque étape, rejouables : mêmes équipes, placements, consignes et graine.
7. Des rapports lisibles et des choix techniques expliqués. Pas de refonte massive sans justification.
8. Aucune fonctionnalité non demandée, même si elle semble intéressante.
9. Signaler les décisions de conception manquantes au lieu de les inventer.
10. Garder un historique des changements et des résultats de tests dans `journal.md`.
11. Après chaque étape, une version exécutable et les instructions pour la lancer.
12. Rectangles, sous-zones, postes, attributs et paramètres modifiables sans réécrire le moteur.
13. **Ne jamais déclarer le moteur « bon » parce que les tests passent ou que les statistiques semblent équilibrées.** Il faut regarder des matchs générés et faire valider le concepteur.
14. **Avant de toucher un comportement du moteur, relire `docs/reference-football.md`**, et traduire chaque principe utilisé en test de réalisme (§9.4).
15. Toujours lancer les tests, vérifier au format téléphone et noter le changement dans `journal.md`.

## Carte du code (`prototype/`, pour ne relire que ce qu'il faut)

TypeScript sans dépendance ; voir aussi le `README.md` du projet.

- `src/sim/` : le moteur, sans affichage ; ne pas le lire pour un changement d'écran. `simulation.ts` (déplacements, lignes), `ballon.ts` (actions et règles ; 1 605 lignes, à découper : prompt A1), `projection.ts` (placement → position de match), `notes.ts`, `influences.ts` (tactiques, styles, pays, fusions), `rng.ts` (hasard à graine).
- `src/jeu/` : `partie.ts` (réserve, draft, ordinateurs, fusions, mercato ; chiffres dans `partie.json`), `championnat.ts` (calendrier, classement, `jouerMatch` sans affichage), `graines.ts` (**le seul endroit d'où viennent les graines**).
- `src/match/` : l'**arbitre de match** (`arbitre.ts` pour l'interface, `arbitreLocal.ts` pour le calcul sur le téléphone) et le **film** (`film.ts`, format documenté en tête). L'écran du match lit le film ; il ne fait pas avancer le moteur.
- `src/enligne/` : le 1 contre 1 en ligne. `serveur.ts` (logique de partie), `equipes.ts` (équipes reçues et vérifiées), `filmReseau.ts` (film binaire), `fonction.ts` (HTTP et stockage Supabase), `client.ts` (côté téléphone). Fichier construit pour la fonction Supabase dans `serveur/` (déploiement : `serveur/README.md`) ; réglages dans `partie.json` → `enLigne`, adresses dans `enligne.json`.
- `src/ui/` : les écrans. Préparation : `ecranPreparation.ts` (logique testée dans `preparation.ts`), `draft.ts`, `offreDraft.ts`, `fiche.ts`. Match : `ecranMatch.ts` (1 397 lignes, prompt A2), `stade.ts`. Autres : `ecranAccueil.ts`, `unContreUn.ts`, `ecranSalon.ts`, `son.ts`, `style.css`. `src/main.ts` relie le tout.
- **Données** dans `src/data/` : `reglages.json`, `notes.json`, `influences.json`, `partie.json`, `noteMatch.json`, `postes.json`, `preparation.json`, et `cartes.json`, généré par `scripts/generer-cartes.py`.
- **Médias** (l'environnement de Claude ne joint ni Kling ni ElevenLabs) : images, planches Kling → workflow `.github/workflows/foot-merge-images.yml` (liste `images-kling/a-telecharger.txt`) → `scripts/decouper-planches.py` → `src/images/joueurs/*.webp` et `src/ui/bustesCatalogue.ts` ; sons, ElevenLabs → workflow `.github/workflows/foot-merge-sons.yml` (liste `sons/a-telecharger.txt`, originaux dans `sons/brut/`) → `src/sons/*.mp3`, inclus dans la page par `scripts/assembler.ts`.
- **Scripts** de mesure dans `scripts/` : `mesurer-realisme`, `mesurer-jeu`, `mesurer-influences`, `mesurer-notes`, `mesurer-bonus`, `mesurer-couloirs`, `mesurer-charniere`, `mesurer-arbitre`. `mesurer-bonus.ts [avant|apres] [graines] [filtre]` ; les autres prennent [graines] [secondes]. Captures et parcours au format téléphone dans `scripts/capture/` (voir son `README.md` ; un match complet prend environ 2 minutes). `scripts/serveur-local.ts` et `scripts/capture/un-contre-un.py` servent à jouer une partie entière à deux navigateurs, `scripts/publier-site.sh <clone de FootMergTactic>` à publier le site.
- **Tests** : `bun test --timeout 30000` lance **187 tests verts**, qui couvrent environ 97 % des lignes du moteur et des règles. Avec les 5 s par défaut, un test statistique échoue par dépassement de temps sur une machine lente. Les écrans se vérifient par captures.
  - **Empreintes** (`tests/empreintes.test.ts`) : 6 matchs et une partie entière, comparés au bit près à `tests/empreintes/reference.json`. Si elles changent, le match n'est plus le même. Ne les régénérer (`MAJ_EMPREINTES=1`) que pour un changement voulu.
  - `bun run verifier` vérifie les types ; `bun run construire` fabrique la page autonome `dist/index.html`.

## État du moment (17/11/2026)

- **Dernière étape livrée** (15/11) : le **1 contre 1 en ligne**, fusionné sur `main` avec l'accord du concepteur (pull request n° 13), site public en ligne, 187 tests verts. Lien partagé sur WhatsApp, 10 minutes chacun pour l'équipe, mi-temps calculées par le serveur Supabase, même film sur les deux téléphones. Reste : la première vraie partie sur deux téléphones.
- **16/11** : audit en trois fichiers, dans le projet claude.ai. Ses décisions sont reportées dans `docs/`, et ses constats sur le code sont gardés tels quels (`decisions.md` §14).
- **17/11** : ce fichier est réorganisé (prompt A4). Le code n'a pas changé.
- **À juger par le concepteur en jouant** (aucun retour pour l'instant) : le déroulé du 1 contre 1 et ses marges (coup d'envoi, reprise) ; le rendu « M2 » et « P3 » et la **fluidité sur téléphone** ; la force des bonus, le bandeau et les éclats de style ; le stade et le changement de côté ; les montées des latéraux, les repiquages, la charnière ; l'équipe automatique, les sons, le premier écran ; les touches, le rythme du championnat, les +10 pièces ; les maillots anglais et allemands, le barème des notes de match, la fatigue visible à la mi-temps.
- **Prochaine étape**, une conversation par prompt, dans l'ordre conseillé par l'audit (au choix du concepteur) : **A1** (découper `ballon.ts`, avant toute retouche du moteur) ; **B1** (essai d'une mi-temps de 30 s) ; **B2** (le mot de l'adjoint) et **B3** (une fusion plus forte) ; **A3** (serveur) avec **B5** (tournoi en ligne) ; **A2** (écran du match, quand la fluidité devient un sujet). Ensuite C1, C2 et D2 : le Club, les maquettes, le nom.
