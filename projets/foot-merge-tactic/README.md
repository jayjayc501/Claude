# Foot Merge Tactic (titre de travail)

Jeu de football mobile : on collectionne des joueurs fictifs (cartes), on les
fusionne, on place son équipe sur un demi-terrain, puis un moteur simule le
match en vue du dessus. Le joueur est l'entraîneur : il ne dirige pas les
footballeurs.

- **État :** prototype 1 (placement et mouvement des blocs), en attente de validation du concepteur.
- **Priorité :** le moteur de match.

## Fichiers

- `CLAUDE.md` : contexte de travail pour Claude (décisions validées, propositions, questions ouvertes, feuille de route).
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

### Où régler quoi

- `prototype/src/data/postes.json` : les postes (maximum de joueurs, ligne défensive) et les deux plateaux. Un plateau se lit comme un dessin : une ligne par rangée, **de la plus basse (près de son but) à la plus haute (ligne médiane)** ; chaque case vaut `"POSTE"` ou `"POSTE:RÔLE"` (par exemple `"MC:MOC"`), `""` = pas de case. En hexagones, une rangée d'une case de moins est décalée d'une demi-case.
- `prototype/src/data/reglages.json` : règles de projection, délai de transition, vitesses, possession simulée.
- `prototype/src/data/influences.json` : effets des tactiques d'équipe et des styles sur les réglages du moteur (proposition). Mesure : `bun run scripts/mesurer-influences.ts [matchs] [secondes]`.
- `prototype/src/data/preparation.json` : équipe, groupe et mercato de l'écran de préparation (chiffres de démonstration).
- `prototype/src/data/equipes.json` : effectif, compositions par défaut (écrites pour le plateau des carrés, converties automatiquement pour les hexagones) et adversaire.
