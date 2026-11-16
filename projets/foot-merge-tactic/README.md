# Foot Merge Tactic (titre de travail)

Jeu de football mobile : on collectionne des joueurs fictifs (cartes), on les
fusionne, on place son équipe sur un demi-terrain, puis un moteur simule le
match en vue du dessus. Le joueur est l'entraîneur : il ne dirige pas les
footballeurs.

- **État :** prototype 1 (placement et mouvement des blocs), en attente de validation du concepteur.
- **Priorité :** le moteur de match.

## Fichiers

- `CLAUDE.md` : contexte de travail pour Claude, court (le jeu en bref, façon de travailler, carte du code, état du moment).
- `docs/decisions.md`, `docs/propositions.md`, `docs/questions-ouvertes.md` : décisions validées, propositions en cours, questions ouvertes ; `docs/historique-etat.md` : ce qui a été remplacé.
- `docs/dossier-conception.md` : dossier de conception complet, document de référence (décisions récentes au §20).
- `journal.md` : historique des étapes et des résultats de tests.
- `prototype/` : prototype web (TypeScript).

## Prototype 1

Deux écrans :
- **Préparation** (maquette du 12/11, `docs/maquette-interface/`) : chrono et classement du groupe, compteurs de pays et de styles, plateau en hexagones avec les joueurs en bustes, banc de 5, mercato. On fait glisser les bustes : sur une case libre de leur poste, sur un joueur du même poste (échange), un remplaçant sur un titulaire, un titulaire sur le banc, ou sur le mercato pour le vendre. Le hors poste est refusé. Toucher un buste affiche son nom ; toucher une carte du mercato l'achète (fusion avec la copie si on l'a déjà).
- **Match** : le terrain entier, ballon réel, sons et annonces. Tactique de chaque équipe modifiable en plein match ; boutons « Tactiques » et « Styles » pour les couper et comparer ; tableau de bord (possession, passes réussies, hauteur des lignes).

### Lancer

Il faut [Bun](https://bun.sh) (aucune autre dépendance).

```sh
cd projets/foot-merge-tactic/prototype
bun test                      # tests du moteur
bun run construire            # fabrique dist/index.html
```

`dist/index.html` est une page autonome : on l'ouvre directement dans un
navigateur. La version en ligne est publiée par Claude sous forme de page
claude.ai (lien dans la discussion et dans `CLAUDE.md`).

### 1 contre 1 en ligne (15/11)

Premier écran → « Créer une partie » : lien à envoyer (WhatsApp, copier, partager).
L'ami l'ouvre dans son navigateur, sans compte ; chacun a 10 minutes pour faire son
équipe, le match est calculé par le serveur (fonction Supabase `partie`) et regardé
en même temps sur les deux téléphones, mi-temps comprise. Serveur et déploiement :
`prototype/serveur/README.md`. Site public : la page `dist/index.html`, publiée dans
le dépôt `FootMergTactic` par `prototype/scripts/publier-site.sh <clone>`.

Essai sans Supabase (deux navigateurs, serveur local) :

```sh
bun run construire && bun run scripts/serveur-local.ts 8787
python3 scripts/capture/un-contre-un.py "http://127.0.0.1:8787/?serveur=http://127.0.0.1:8787/api" /tmp/1c1
```

### Où régler quoi

- `prototype/src/data/postes.json` : les postes (maximum de joueurs, ligne défensive) et les deux plateaux. Un plateau se lit comme un dessin : une ligne par rangée, **de la plus basse (près de son but) à la plus haute (ligne médiane)** ; chaque case vaut `"POSTE"` ou `"POSTE:RÔLE"` (par exemple `"MC:MOC"`), `""` = pas de case. En hexagones, une rangée d'une case de moins est décalée d'une demi-case.
- `prototype/src/data/reglages.json` : règles de projection, délai de transition, vitesses, possession simulée.
- `prototype/src/data/influences.json` : effets des tactiques d'équipe et des styles sur les réglages du moteur (proposition). Mesure : `bun run scripts/mesurer-influences.ts [matchs] [secondes]`.
- `prototype/src/data/preparation.json` : équipe, groupe et mercato de l'écran de préparation (chiffres de démonstration).
- `prototype/src/data/equipes.json` : effectif, compositions par défaut (écrites pour le plateau des carrés, converties automatiquement pour les hexagones) et adversaire.
