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
- **Placement** (une page) : le plateau sur le demi-terrain, et le banc. Le plateau est toujours visible, en couleurs (jaune le gardien, bleu la défense, violet le milieu, rouge l'attaque ; couloirs des côtés plus clairs), en **hexagones** ou en **carrés** au choix (boutons en haut à droite ; la composition suit, chaque joueur garde son poste). On fait glisser les ronds : sur une case libre (le joueur y va), sur un autre joueur (échange, ou entrée d'un remplaçant), sur le banc (sortie). Un simple toucher affiche le joueur.
- **Match** : le terrain entier. Les 22 joueurs partent de leurs positions de coup d'envoi, puis montent ou redescendent selon une possession simulée. Pas encore de passes ni de tirs.

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
- `prototype/src/data/equipes.json` : effectif, compositions par défaut (écrites pour le plateau des carrés, converties automatiquement pour les hexagones) et adversaire.
