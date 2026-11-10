# Short « Odin va-t-il se faire dévorer par ce loup ? »

## Script final (validé)

> Odin va-t-il se faire dévorer par ce loup ?
> Il a payé de son sang pour avoir la réponse.
> Odin, c'est le Père-de-Tout. Mais il y a une chose qu'il ne contrôle pas : l'avenir.
> Alors il descend sous les racines d'Yggdrasil, l'arbre de vie. Il arrive au puits de Mímir : boire son eau donne la réponse à toutes les questions.
> Mais tout savoir a un prix. Mímir, le gardien du puits, exige un œil pour une gorgée.
> Odin s'arrache l'œil et le jette au fond du puits, avant de boire.
> Et là, il comprend tout : le passé, le destin des hommes… le Ragnarök.
> Ce jour-là, Fenrir sera libéré et dévorera Odin, avant que le feu ne marque la fin du monde.

Coupe sèche → la vidéo reboucle sur la question d'accroche.

## Voix (validée)

- ElevenLabs, voix **Adam Composer Stockholm** (`x0u3EW21dbrORJzOq1m9`), modèle **Eleven v3**, stabilité **50 %**, langue forcée **français**.
- Prononciation : écrire **« Odain »** dans le texte ElevenLabs pour obtenir « Odin » (sinon il dit « Odine »).
- Post-traitement : `atempo=1.04` + `loudnorm=I=-16` → 47,4 s. On garde toutes les pauses (une version sans pauses a été jugée trop rapide).

## Personnages de référence (fond neutre)

| Personnage | Modèle retenu | Notes |
|---|---|---|
| Odin | GPT-Image 2.5 (qualité high) | chapeau bas à large bord (pas pointu), cape bleu nuit, fourrure de loup, cotte de mailles, bracelets d'or, deux corbeaux sur les épaules, lance gravée |
| Mímir | GPT-Image 2.5 (qualité high) | sage ancien et noble (pas un troll), peau de pierre/écorce, barbe blanche mêlée de racines, yeux dorés, corne gravée |
| Fenrir | Kling Image 3.0 Omni | loup colossal noir-gris, yeux ambrés, chaînes brisées |

Leçons :
- Kling refuse (« copyright ») les prompts contenant « Odin » ou décrivant un vieillard au chapeau pointu → ne pas nommer Odin, chapeau **plat**.
- GPT-Image 2.5 donne le rendu le plus cinéma pour les personnages ; Nano Banana Pro est moins bon ici et plus cher (40 crédits/2 images).
- Coûts : Kling Image 3.0 Omni ≈ 2 crédits/image, GPT-Image 2.5 high ≈ 15, Nano Banana Pro ≈ 20.

## Storyboard (temps de la voix finale)

| # | Temps | Texte | Plan |
|---|---|---|---|
| P01 | 0,0–2,2 | Odin va-t-il se faire dévorer par ce loup ? | Ragnarök : la gueule de Fenrir au-dessus d'Odin borgne |
| P02 | 3,1–5,7 | Il a payé de son sang… | Très gros plan : Odin borgne, filet de sang |
| P03 | 6,1–8,4 | Odin, c'est le Père-de-Tout. | Odin sur son trône à Asgard — nom doré « Odin » |
| P04 | 9,0–12,6 | …il ne contrôle pas : l'avenir. | Odin au bord d'une falaise face à un ciel d'orage |
| P05 | 13,1–15,2 | Alors il descend sous les racines d'Yggdrasil | Plan large : l'arbre cosmique |
| P06 | 15,2–17,2 | l'arbre de vie. | Odin descend entre les racines géantes |
| P07 | 17,8–20,3 | Il arrive au puits de Mímir | Le puits doré dans la caverne |
| P08 | 20,3–22,7 | …la réponse à toutes les questions. | Macro : l'eau reflète étoiles et runes |
| P09 | 23,4–24,8 | Mais tout savoir a un prix. | Mímir ouvre ses yeux dorés — nom « Mímir » |
| P10 | 25,3–29,8 | Mímir… exige un œil pour une gorgée. | Face-à-face Mímir / Odin au bord du puits |
| P11 | 30,3–31,6 | Odin s'arrache l'œil | Gros plan, main sur l'œil, dans l'ombre (sans gore) |
| P12 | 31,6–33,0 | et le jette au fond du puits | Ralenti : une lueur dorée tombe dans l'eau |
| P13 | 33,0–34,3 | avant de boire. | Odin borgne boit à la corne |
| P14 | 34,6–37,0 | il comprend tout : le passé, le destin des hommes… | Visions dorées tourbillonnant autour d'Odin |
| P15 | 37,0–40,1 | …le Ragnarök. | Le ciel des neuf mondes en feu |
| P16 | 40,9–43,5 | Ce jour-là, Fenrir sera libéré | Fenrir brise sa chaîne — nom « Fenrir » |
| P17 | 43,5–45,5 | et dévorera Odin, | Fenrir bondit, gueule ouverte, sur Odin |
| P18 | 45,5–47,4 | …la fin du monde. | Le monde englouti par le feu → boucle sur P01 |
