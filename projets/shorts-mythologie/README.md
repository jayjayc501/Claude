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

## Shorts

| Sujet | Dossier | État |
|---|---|---|
| Pourquoi Odin n'a qu'un œil ? | `shorts/odin-oeil` | script prêt, médias à générer |
