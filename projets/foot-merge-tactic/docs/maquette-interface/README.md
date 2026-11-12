# Maquette de l'interface — écran de préparation (12/11/2026)

Maquette en ligne (claude.ai, canevas Design) : https://claude.ai/artifact/67QRVRz7Fd6f8YWD9gHPq4
Décisions : `CLAUDE.md` du projet, section « Interface (séance du 12/11) ».

## Contenu

- `ecran-preparation-v2.dc.html` : source de la V2 retenue (bustes, couleurs par pays, fusions bleu / or / violet avec étincelles). Format « Design Component » du canevas claude.ai : la mise en page est dans le HTML, les données (joueurs, postes, cartes du mercato) et les effets de fusion dans le script en bas du fichier (`renderVals`, fonction `look`, option `fx = 'couleurs'`).
- `ecran-preparation-v1.dc.html` : V1 mise de côté (ronds de couleur par pays, jauge de fusion).
- `bustes/` : 18 bustes de joueurs, PNG transparents 96 × 97 (affichés en 48 × 49 sur le plateau), base du buste en bas de l'image.

## Bustes

Générés avec Kling (style jouet en vinyle), découpés et pour certains recolorés (maillot) par Claude. **Images de référence pour la maquette, pas les visuels définitifs** : elles contiennent de petits logos et numéros à retirer.

| Fichier | Joueur | Pays | Poste | Posture (style) |
|---|---|---|---|---|
| bust-MO | Ollivier | France | G | ballon et gant levé (gardien) |
| bust-JM | Marchal | France | DD | bras croisés (rempart) |
| bust-TR | Roux | France | BU | poings serrés, penché (presseur) |
| bust-HF | Ferrand | France | MC | mains sur les hanches (vétéran, recoloré) |
| bust-AM | Mercier | France | AG | bras en course (recoloré) |
| bust-IS | Salvat | Espagne | MC | montre la direction (créateur) |
| bust-RC | Castell | Espagne | DG | se désigne, gants (finisseur) |
| bust-PA | Arnau | Espagne | MC | ballon sur le doigt (recoloré) |
| bust-AS | Sanz | Espagne | BU | bras en course (recoloré) |
| bust-DA | Almar | Espagne | MC | poing levé (recoloré) |
| bust-KM | Moura | Brésil | AD | poing levé (combatif) |
| bust-BL | Lima | Brésil | AG | bras en course (rapide) |
| bust-CB | Brandão | Brésil | AD | montre la direction (recoloré) |
| bust-EL | Lobo | Brésil | MC | ballon sur le doigt (recoloré) |
| bust-LM | Monti | Italie | DC | ballon sur le doigt (technicien) |
| bust-NV | Vitale | Italie | DC | mains sur les hanches (vétéran) |
| bust-DK | Conti | Italie | DC | bras croisés (recoloré) |
| bust-MV | Vianello | Italie | DC | se désigne (recoloré) |

## Effets de fusion (V2, option B)

Aura autour de la silhouette (CSS `filter: drop-shadow(...)` empilés) et anneau du socle (ellipse SVG), une couleur par niveau :
- 1 fusion : bleu `#5EC8FF` ;
- 2 fusions : or `#FFC400` ;
- 3 fusions : violet `#C04BFF` + halo rose, et 5 étincelles blanches bordées de violet.
