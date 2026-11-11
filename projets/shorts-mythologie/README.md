# Shorts — La Pause Mytho…logique

Fabrication de Shorts YouTube verticaux (1080x1920, 60 à 90 s) pour la chaîne
[La Pause Mytho…logique](https://www.youtube.com/@lapausemythologique).

- **Images** : clips générés avec Kling (5 s, format 9:16).
- **Voix off** : générée avec ElevenLabs (toujours la même voix).
- **Montage** : `monter.py` (ffmpeg uniquement) assemble les clips sur la voix,
  ajoute les sous-titres incrustés (mots clés en or) et une musique facultative.

## Organisation

```
charte-visuelle.md        couleurs, ambiance, personnages, style des prompts
monter.py                 outil de montage
shorts/<sujet>/plan.json  script découpé en segments + prompts Kling par plan
shorts/<sujet>/medias/    clips et voix générés (non versionnés)
shorts/<sujet>/sortie/    vidéo finale + sous-titres .ass (non versionnés)
```

## Fabriquer un Short

1. Écrire `shorts/<sujet>/plan.json` (voir `shorts/odin-oeil/plan.json`).
   Dans le texte, entourer les mots à afficher en or par des `*étoiles*`.
2. Texte à coller dans ElevenLabs :
   `python3 monter.py narration shorts/<sujet>/plan.json`
   → enregistrer le MP3 sous `shorts/<sujet>/medias/voix.mp3`.
3. Prompts à coller dans Kling (9:16, 5 s) :
   `python3 monter.py prompts shorts/<sujet>/plan.json`
   → enregistrer chaque clip sous `medias/01.mp4`, `medias/02.mp4`, etc.
4. Montage :
   `python3 monter.py monter shorts/<sujet>/plan.json`
   → `shorts/<sujet>/sortie/<sujet>.mp4`

Pour tester le montage sans dépenser de crédits :
`python3 monter.py monter shorts/<sujet>/plan.json --factice`
(crée des clips de couleur et une voix de test).

## Synchronisation voix / images

Par défaut, chaque segment reçoit une durée proportionnelle à la longueur de
son texte, puis chaque frontière est calée sur le silence le plus proche dans
la voix off. Si un plan tombe mal, ajouter `"debut": 12.4` (en secondes) à
**tous** les segments du `plan.json` pour imposer les temps.

## Montage « timeline » (monter2.py) — méthode recommandée

`monter2.py` suit une timeline précise décrite dans `shorts/<sujet>/montage.json` :
plans avec début/fin exacts (calés sur les silences de la voix), mouvement de
caméra par plan (`push`, `punch`, `pull`, `fixe`), vitesse, noms dorés en
surimpression (image or sur fond noir rendue transparente), titre d'accroche
et quelques mots-clés dorés, musique + bruitages des clips avec ducking sous la
voix, étalonnage léger et loudness YouTube (−14 LUFS). Le texte complet part
dans un `.srt` à importer dans YouTube Studio.

Réglages qualité (`montage.json`) :
- `"resolution": [2160, 3840]` : rendu 4K vertical. YouTube réserve son meilleur
  codec (VP9/AV1, plus de débit) aux vidéos ≥ 1440p : l'image reste nette même
  pour les spectateurs en 1080p. Chaque clip n'est redimensionné qu'une fois
  (lanczos, zoom compris).
- `"ips": 24` : cadence native des clips Kling (24 → 30 i/s faisait saccader).
- `"nettete": 0.35` (filtre CAS), `"grain": 0` (le grain se compresse mal sur YouTube).
- `"crf": 18`, `"preset": "medium"`.

Mots-clés : chacun doit avoir un sens tout seul (« Payé de son sang », pas
« Sang »). Les caler sur la voix : début de l'expression → un peu après sa fin.

Carte de fin (`"fin"`) : décor vidéo, `"fondu"` (fondu enchaîné depuis le
dernier plan, en s), `"vitesse"`, et `"logo_anime": true` → le logo est découpé
ligne par ligne puis icône par icône et entre avec fondu, montée et flou qui se
dissipe, halo doré et reflet de lumière (`logo_anime.py`).

    python3 monter2.py shorts/odin-oeil/montage.json
    python3 monter2.py shorts/odin-oeil/montage.json --factice   # test sans médias

Chaîne de production qui a donné le meilleur résultat (voir `shorts/odin-oeil/storyboard.md`) :
1. Script validé → voix ElevenLabs : voix Adam Composer Stockholm (`x0u3EW21dbrORJzOq1m9`),
   Eleven v3, stabilité 50 %, langue forcée FR. Écrire « Odain » pour qu'il prononce « Odin ».
2. Personnages de référence sur fond neutre (GPT-Image 2.5 via Kling).
3. Une image clé par plan (GPT-Image 2.5, image-to-image avec les références).
4. Animation Kling 4.0 en 1080p, durée = durée du plan (15 crédits/s).
5. Musique ElevenLabs Music (instrumental), noms dorés générés en image.
6. Le navigateur regroupe les médias dans un ZIP → glissé dans la conversation → `monter2.py`.

## Shorts

| Sujet | Dossier | État |
|---|---|---|
| Odin va-t-il se faire dévorer par ce loup ? (l'œil d'Odin) | `shorts/odin-oeil` | terminé, v3 4K (51,7 s) — à publier |

## Matériel commun à tous les Shorts

Avant un nouveau Short, lire **`METHODE.md`** (façon de travailler, script, voix, Kling, montage, contrôle, publication).

- `commun/noms/` : noms dorés transparents d'Odin, Mímir et Fenrir (pour `"noms"` dans montage.json).
- `commun/musiques/` : « Ritual of the Last Dawn » (ElevenLabs Music, instrumental).

`commun/fin-chaine/` : la carte de fin de la chaîne, à réutiliser telle quelle.
- `fin-fond.mp4` : décor animé (corbeau sur pierre runique, oiseau doré, horizon en feu), 3 s, 1080x1920.
- `fin-texte.png` : texte du logo détouré (La pause Mytho… logique, NORDIQUE, icônes).

Dans le `montage.json` d'un nouveau Short (chemins relatifs au dossier du Short) :

```json
"fin": {"fichier": "../../commun/fin-chaine/fin-fond.mp4", "duree": 3.3, "vitesse": 0.92,
        "fondu": 0.9, "logo": "../../commun/fin-chaine/fin-texte.png", "logo_anime": true,
        "logo_largeur": 800, "logo_y": 500}
```

