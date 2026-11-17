# Captures et parcours automatiques

Outils pour vérifier le prototype au format téléphone (390 × 750), sans Playwright :
Chrome sans fenêtre piloté directement (`/usr/bin/google-chrome`).

À lancer depuis `prototype/`, après `bun run construire`.

| Fichier | Rôle |
|---|---|
| `capture.mjs` | ouvre la page, enchaîne les actions données, capture l'écran |
| `draft.js` | fait les 11 choix du draft (premier joueur abordable de chaque offre) |
| `mi-temps.js` | « Jouer ▶ », coup d'envoi, attend la mi-temps |
| `fin-match.js` | « 2e mi-temps ▶ », attend la fin du match, touche « Continuer ▶ » |
| `achat.js` | achète une copie au mercato (pour voir une fusion) |
| `planche-bustes.py` | planche contact des bustes d'un ou plusieurs pays |

Exemples :

```bash
# Écran de préparation après le draft
node scripts/capture/capture.mjs dist/index.html /tmp/draft.png "js:$(cat scripts/capture/draft.js)"

# Journée 2 du championnat (un match complet : environ 2 minutes)
node scripts/capture/capture.mjs dist/index.html /tmp/j2.png \
  "js:$(cat scripts/capture/draft.js)" "js:$(cat scripts/capture/mi-temps.js)" "js:$(cat scripts/capture/fin-match.js)"

# Championnat entier (3 matchs : environ 7 minutes) : répéter mi-temps.js et fin-match.js trois fois

# Bustes anglais et allemands
python3 scripts/capture/planche-bustes.py /tmp/bustes.png ENG GER
```

Un match se joue en temps réel à la vitesse ×3,5 (environ 51 s par mi-temps) :
prévoir un `timeout` long. Ouvrir les PNG avec l'outil de lecture d'images.
