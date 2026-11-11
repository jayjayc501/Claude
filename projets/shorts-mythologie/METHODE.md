# Méthode — faire un Short pour La Pause Mytho…logique

À lire avant de commencer un nouveau Short. Tout ce qui suit vient du Short Odin
(novembre 2026) et des remarques du propriétaire de la chaîne.

## 1. Façon de travailler avec le propriétaire

- Niveau d'exigence : **celui des vidéos longues de la chaîne** (pas des anciens Shorts),
  avec le rythme d'un Short de 2026. Viser un résultat « bluffant ».
- **Ne pas demander son avis toutes les 2 minutes.** Faire soi-même plusieurs essais,
  choisir le meilleur, et montrer un résultat abouti.
- Lui faire valider : le **script**, la **voix**, puis le **montage final**. Le reste se décide seul.
- Kling coûte des crédits : annoncer **une fois** le budget prévu, puis avancer sans
  redemander (les seules corrections du Short Odin ont coûté environ 200 crédits).
- Répondre en français, simplement, sans jargon technique.

## 2. Script (le propriétaire réécrit souvent la version finale : c'est sa version qui fait foi)

- **Accroche = une question qui divulgue l'enjeu**, dite et affichée dès la 1re seconde
  (ex. « Odin va-t-il se faire dévorer par ce loup ? »), suivie d'une relance
  (« Il a payé de son sang pour avoir la réponse »).
- Puis on **déroule l'histoire en détail, avec du rythme**, jusqu'à la chute, et on **coupe sec** :
  la vidéo reboucle sur la question.
- Phrases courtes, français parlé. Refusé : trop long, « ça fait trop IA », survol du mythe,
  effets gratuits (« Odin vient de s'arracher un œil. Avec ses doigts. Et il sourit. » = nul).
- Vocabulaire : « le Père-de-Tout » (jamais « le chef des dieux »).
- Exactitude du mythe : ne pas mélanger les épisodes (ex. Odin pendu à Yggdrasil pour les
  runes ≠ l'œil donné au puits de Mímir). Vérifier avant d'écrire.
- Durée de voix visée : 45 à 50 s.

## 3. Voix (ElevenLabs)

- Voix **Adam Composer Stockholm** (`x0u3EW21dbrORJzOq1m9`), **Eleven v3**, stabilité **50 %**,
  langue forcée **français**.
- Prononciation : écrire « Odain » pour « Odin ». Tester les autres noms propres de la même façon.
- **Garder les pauses** de la prise originale ; accélérer au plus de 4 % (`atempo=1.04`).
  Une version sans pauses a été jugée « beaucoup trop rapide ».
- Musique : ElevenLabs Music, instrumental épique nordique. `commun/musiques/` contient
  « Ritual of the Last Dawn » (utilisée pour Odin).

## 4. Images et clips (Kling)

- Voir `charte-visuelle.md` : photoréaliste cinéma, or chaud + bleu nuit, personnages décrits.
- Portraits de personnages : **sur fond neutre**, réutilisables. Ceux d'Odin, Mímir et Fenrir
  sont dans l'historique Kling (Assets) ; leurs descriptions exactes sont dans la charte.
- Modèles : images clés **GPT-Image 2.5 qualité high** (~15 crédits) ; vidéos **Kling 4.0 en 1080p**
  (15 crédits/s, plans de 3 à 5 s).
- Filtre de Kling : ne jamais écrire « Odin » (ni chapeau pointu), éviter les chaînes qui se
  brisent et la violence explicite → décrire autrement (« the old god-king from image 1 »).
  Une tâche refusée est remboursée.
- Interdits : personnages façon super-héros (« Thor qui vole »), gore. Suggérer.
- Cohérence : vérifier les détails d'un plan à l'autre (Odin borgne de l'**œil droit** partout ;
  un plan inversé avec `"miroir": true` si besoin).
- Les liens Kling expirent au bout de ~24 h : noter les identifiants dans `medias-kling.md`.

## 5. Récupérer les fichiers

Si l'accès réseau à `klingai.com` et `elevenlabs.io` est ouvert dans les réglages de claude.ai,
télécharger directement. Sinon : dans un onglet kling.ai, récupérer les fichiers en JavaScript,
fabriquer un ZIP, l'enregistrer par un bouton visible, et demander au propriétaire de glisser
le ZIP dans le chat.

## 6. Montage (`monter2.py`)

- Un dossier `shorts/<nom>/` avec `montage.json`, `storyboard.md`, `medias-kling.md`.
- Réglages qui ont fait leurs preuves (voir `shorts/odin-oeil/montage.json`) :
  `resolution` 2160x3840, `ips` 24, `crf` 18, `nettete` 0.35, `grain` 0,
  `decalage_voix` 1.0 (1 s d'image avant la voix), `volume_musique` 0.30, `son_plans` 0.12.
- Texte à l'écran : titre d'accroche (la question), puis **5 expressions au maximum**,
  chacune **compréhensible seule** (« Payé de son sang », jamais « Sang » seul), calée sur la voix.
  Pas de sous-titres incrustés : le texte complet part dans le `.srt`.
- Noms dorés des personnages à leur première apparition (`commun/noms/` pour Odin, Mímir, Fenrir).
- Carte de fin commune : `commun/fin-chaine/` (voir README), fondu enchaîné + logo animé.
- Rendu 4K : environ 16 min.

## 7. Contrôle avant d'envoyer

- Planches d'images : chaque plan, chaque mot affiché, la carte de fin.
- Les mots tombent bien sur la voix (repérer les « s » et « f » dans le spectre si besoin).
- Cohérence des personnages (même œil, mêmes vêtements).
- Son : −14 LUFS, pas de saccade aux coupes, bruitages sous la voix.
- Vérifier chaque texte affiché comme un spectateur qui ne lit que lui.

## 8. Publication

Modèle : `shorts/odin-oeil/fiche-publication.html`.
- **Titre = la première phrase de la vidéo** (la question d'accroche).
- Description : une phrase qui prolonge le titre sans le répéter, puis la signature
  « À bientôt sur La Pause Mytho… logique, la mythologie sans mytho. » et 5 hashtags
  (#mythologienordique en premier).
- Lien vers une vidéo longue : par « Vidéo associée » dans YouTube Studio (un lien écrit dans
  la description d'un Short n'est pas cliquable).
- Importer le `.srt` en français ; « pas conçue pour les enfants » ; publier depuis un ordinateur,
  importer le matin et programmer vers 17 h.
