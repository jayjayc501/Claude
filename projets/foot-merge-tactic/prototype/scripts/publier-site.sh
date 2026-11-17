#!/usr/bin/env bash
# Publie le jeu sur le site public (dépôt séparé FootMergTactic, GitHub Pages, 15/11) :
# la page autonome dist/index.html devient index.html du dépôt du site.
#   scripts/publier-site.sh <clone du dépôt FootMergTactic>
# Réglage à faire une fois dans FootMergTactic : Settings → Pages → Deploy from a branch → main, / (root).
set -euo pipefail
site="${1:?chemin du clone de FootMergTactic}"
ici="$(cd "$(dirname "$0")/.." && pwd)"
(cd "$ici" && bun run construire)
cp "$ici/dist/index.html" "$site/index.html"
touch "$site/.nojekyll"
commit="$(git -C "$ici" rev-parse --short HEAD)"
git -C "$site" add index.html .nojekyll
git -C "$site" commit -m "Jeu : version $commit du dépôt Claude (projets/foot-merge-tactic/prototype)" || echo "Rien de nouveau à publier."
git -C "$site" push origin HEAD:main
