# Charte visuelle — La Pause Mytho…logique

Référence de qualité : les **vidéos longues** de la chaîne (pas les anciens Shorts).

## Images
- **Photoréaliste et cinématographique** (rendu « film historique Viking »), jamais de
  peinture numérique ni de style dessin animé.
- Palettes variées selon la scène : feu orange, nuit bleu profond, lumière dorée.
  Fil rouge : or chaud + bleu nuit.
- Le corbeau est l'emblème de la chaîne (logo, carte de fin, corbeaux d'Odin).
- Pas de personnages façon super-héros (refusé : « Thor qui vole »). Pas de gore : suggérer.

## Personnages récurrents (références sur fond gris neutre)
- **Odin** : vieux roi-dieu imposant, barbe gris argent tressée avec perles, chapeau
  **plat** à large bord en cuir usé (jamais pointu), cape bleu nuit élimée, mante en
  fourrure de loup, cotte de mailles, bracelets d'or, tatouages runiques sur les mains,
  deux corbeaux sur les épaules, lance à pointe de fer gravée. Borgne de l'**œil droit**
  après le sacrifice du puits.
- **Mímir** : sage primordial, grand et noble (pas un troll), peau de pierre et d'écorce
  avec mousse, très longue barbe blanche mêlée de racines, yeux dorés lumineux, corne
  à boire gravée.
- **Fenrir** : loup colossal noir-gris, yeux ambrés, crocs, fragments de chaîne brisée.
- **Loki** (choisi par le propriétaire, `commun/personnages/loki/`) : homme mince d'une trentaine d'années,
  longs cheveux bruns lisses, oreilles légèrement pointues, yeux clairs perçants, habits **vert foncé**
  (tunique de laine, long manteau à col effiloché), large ceinture de cuir à boucle ronde, bracelets de
  cuir noir, pendentif sur un cordon, bottes de cuir. Jamais de casque à cornes ni de vert et or façon film.

## Texte à l'écran
- **Noms des personnages** : lettres gothiques (Fraktur) or métallique, en haut à droite,
  à leur première apparition (images générées sur fond noir, rendues transparentes).
- **Titre d'accroche** (la question) pendant les 3 premières secondes, puis **5 expressions
  au maximum**, en or, police Inter Display Black, chacune compréhensible seule
  (« Payé de son sang », jamais « Sang » tout seul), calée sur la voix.
  Pas de sous-titres complets incrustés : le texte complet va dans le fichier `.srt`
  importé dans YouTube (CC).
- Images des noms prêtes : `commun/noms/` (Odin, Mímir, Fenrir).

## Carte de fin
`commun/fin-chaine/` : décor animé (corbeau sur pierre runique, oiseau doré, horizon en feu)
et texte du logo « La pause Mytho… logique + NORDIQUE ». Fondu enchaîné de 0,9 s depuis le
dernier plan, puis le logo s'écrit ligne par ligne (logo_anime.py) ; 3,3 s en tout.
Le texte du logo vient d'une capture en 720×1280 : le remplacer par le fichier original
du logo s'il est disponible.

## Prompts (anglais)
Les prompts commencent par « Photorealistic cinematic film still, vertical 9:16 » et se
terminent par « Shot on ARRI Alexa, anamorphic lens, film grain, epic Viking historical
drama, no text, no logo ». Ne jamais écrire « Odin » dans un prompt Kling (filtre
copyright) : dire « the old god-king from image 1 ».
