# Idées d'applis classées

Page qui recense les idées d'applis étudiées avec Claude : note sur 20, niveau de
concurrence, fiche détaillée (plus, moins, risques, complexité, sources) et, pour
les dernières, comment les rentabiliser.

- En ligne : https://jayjayc501.github.io/Claude/idees-applis/
- Copie privée sur claude.ai : https://claude.ai/artifact/Ry8GhtDbpS4hMLf4fE7yjr
- Fichier unique : `index.html` (les idées sont dans le tableau `D` du script).

La page est mise en ligne par le workflow `.github/workflows/jetelavaisdit.yml`,
qui publie tout le site GitHub Pages du dépôt. Après chaque changement, mettre à
jour les deux copies (ce fichier et la page claude.ai).

## À chaque ajout d'idées

- Mettre `neu:true` sur les idées du nouveau lot uniquement, et le retirer des anciennes.
- Mettre à jour la constante `LOT` (date de l'ajout) : elle s'affiche dans l'encadré « Nouveau » en haut de la page.
- Les idées du lot sont alors listées dans l'encadré et surlignées dans la liste.
- Chaque idée doit avoir sa rubrique « Comment la rentabiliser » (`money`).
- Note « Argent » = moyenne de deux sous-notes sur 5 : `r` (rentable vite) et `g` (gains possibles), à renseigner dans `s` ; le total peut donc tomber sur un demi-point.
