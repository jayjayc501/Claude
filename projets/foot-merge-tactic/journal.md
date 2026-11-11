# Journal du projet — Foot Merge Tactic

Historique des étapes, des choix techniques et des résultats de tests.

## 11/11/2026 — Prototype 1 : placement sur le demi-terrain et mouvement des blocs

**Ce qui a été fait**
- Prototype web (TypeScript, page autonome) dans `prototype/`. Choix validé par le concepteur : pas de Godot pour l'instant (pas installable dans l'environnement de Claude, ni sur le PC de travail du concepteur).
- Données dans `prototype/src/data/` : postes, rectangles et cases (`postes.json`), réglages de projection et de mouvement (`reglages.json`), effectif et adversaire fictifs (`equipes.json`).
- Moteur dans `prototype/src/sim/` (aucune dépendance à l'affichage) :
  - `donnees.ts` : calcule les cases de chaque rectangle ;
  - `placement.ts` : règles (11 joueurs, une case par joueur, maximum par poste, hors poste) ;
  - `projection.ts` : position du demi-terrain → position de match en attaque ou en défense ;
  - `simulation.ts` : 22 joueurs, possession simulée, délai de transition, déplacements progressifs et séparation, graine aléatoire.
- Affichage dans `prototype/src/ui/` : écran de placement (demi-terrain étiré pour des cases plus grandes) et écran de match (terrain vertical).

**Tests** (`bun test`, 20 tests, tous verts)
- Nombre de cases par poste conforme aux décisions (G 2, DC 6, DG 3, DD 3, milieu 6, AG 3, AD 3, attaquant 5).
- Toutes les cases dans son propre camp au coup d'envoi.
- Placement : 3 DC acceptés, 4e refusé ; case déjà prise refusée ; pas de 12e joueur ; hors poste détecté.
- Projection : chaque case plus haute en attaque qu'en défense ; un DC placé haut reste plus haut qu'un DC placé bas ; l'attaquant « devant le but » arrive vers la surface adverse ; le bloc glisse du côté du ballon.
- Simulation (90 s) : aucun joueur ne sort du terrain, déplacement maximal par pas ≤ vitesse maximale × pas de temps (pas de téléportation) ; même graine = même match ; bascule attaque / défense seulement après le délai ; le bloc monte de plus de 15 m en moyenne avec le ballon ; distance minimale entre joueurs > 1 m.

**Vérification visuelle** : page ouverte dans un navigateur au format téléphone (390 × 844), thèmes clair et sombre, parcours complet (passer à 3 DC, 4e DC refusé, match, possession forcée, zones affichées). Aucune erreur dans la console.

**Ce que les tests ne disent pas** : si le mouvement ressemble à du football et si le placement est agréable au doigt. À juger par le concepteur sur son téléphone.

**Réglages provisoires** (non validés, dans les données) : maximums par poste autres que 3 DC et 1 AG ; montées en attaque (G 5 m, DC 20 m, latéraux et milieux 30 m, côtés 35 m, attaquant 40 m) ; écartement 20 % ; délai de transition 0,5 s ; vitesse maximale 7 m/s.
