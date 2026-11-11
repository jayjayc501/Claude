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
- **Placement** : le demi-terrain, les rectangles de chaque poste et leurs cases. On choisit un joueur (sur le terrain ou dans l'effectif), puis une case de son poste.
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

- `prototype/src/data/postes.json` : rectangles, cases, maximum de joueurs et montée en attaque de chaque poste.
- `prototype/src/data/reglages.json` : règles de projection, délai de transition, vitesses, possession simulée.
- `prototype/src/data/equipes.json` : effectif, composition par défaut et adversaire.
