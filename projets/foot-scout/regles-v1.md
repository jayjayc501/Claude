# Règles chiffrées V1 : Foot Scout

Fiche de règles qui servira de base au futur code. **Tous les chiffres sont des premiers réglages, à ajuster en jouant.**
Le brouillard (partie 4) est déjà calibré par simulation : `sim/brouillard.py`.

## 1. Le temps : tout se compte en jours

- 5 jours de travail par semaine, découpés en demi-journées (0,5 jour).
- Une saison = 46 semaines, de S1 (début juillet) à S46 (mi-mai).

| Période | Semaines | Ce qui change |
|---|---|---|
| Mercato d'été | S1 à S9 | 3 à 5 demandes du club, 1 à 2 semaines pour rendre un avis |
| Saison | S10 à S26 | 1 à 2 demandes, 6 à 10 semaines pour y répondre : on suit des pistes longues |
| Mercato d'hiver | S27 à S31 | 3 à 5 demandes, délais courts, rivaux plus présents |
| Saison | S32 à S43 | Pistes longues, préparation de l'été |
| Fin de saison | S44 à S46 | Bilan, jauges, offres d'autres clubs |

- Trêves internationales vers S11, S15, S20 et S38 : peu de matchs de club, mais des sélections de jeunes à aller voir.
- Une demande du club non rendue à temps : rapport en retard, confiance du club −3.

## 2. Déplacements et budget

| Destination | Jours (aller, match, retour) | Coût moyen |
|---|---|---|
| Sa région | 1 | 80 € |
| Même pays | 1 | 220 € |
| Europe | 1,5 | 450 € |
| Autre continent | 3,5 | 2 200 € |

- Entretien sur place (même ville, même voyage) : +0,5 jour, pas de coût en plus.
- Rédiger un rapport : 0,5 jour.
- Les vols sont bon marché : ce qui limite vraiment, ce sont les **jours**, pas l'argent, sauf pour les petits clubs.

**Budget de recrutement d'une saison (frais de scout, hors transferts)**

| Club | Budget |
|---|---|
| Troisième division | 15 000 € |
| Deuxième division | 60 000 € |
| Milieu de première division | 150 000 € |
| Grand club | 500 000 € et plus |

Avec une confiance du club à 65 ou plus, le budget de la saison suivante augmente de 25 %.

## 3. Le joueur : attributs et traits cachés

**Attributs (1 à 100)** : Vitesse, Technique, Passe, Finition, Défense, Physique, Mental, Vision.
Le **niveau** est la moyenne pondérée selon le poste. Le **potentiel** va de 40 à 99 et n'est jamais affiché directement.

**Traits cachés** (0 à 3 par joueur) :

| Trait | Effet en jeu |
|---|---|
| Fragile | Risque de blessure ×2 |
| Mal du pays | Progression ×0,7 la première saison à l'étranger |
| Grand match | Forme +5 dans les matchs importants |
| Indiscipliné | Cartons, suspensions, conflits au club |
| Ambitieux | Progression ×1,1, mais veut partir plus tôt |
| Entourage envahissant | Exigences plus fortes, négociation plus dure |
| Leader | Fait progresser les jeunes autour de lui |

## 4. Le brouillard : ce que le scout voit

**Chaque match donne un indice par attribut observé** :
indice = vraie valeur + forme du jour (écart-type 5) + bruit du scout (écart-type s).

- s = 10 dans la spécialité du scout, 15 en dehors ; −1 par niveau d'**œil** (0 à 5), minimum 4.
- **Fourchette affichée** = moyenne des indices ± 1,3 × √(s² + 5²) / √n, n étant le nombre de matchs vus. Demi-largeur plafonnée à 30.
- Réglée ainsi, la vraie valeur tombe dans la fourchette **environ 8 fois sur 10** (simulation : 80 à 82 %). Le scout peut donc se tromper, et c'est voulu.

**Libellés de certitude**

| Libellé | Fourchette |
|---|---|
| Flou | plus de ±15 |
| Correct | ±9 à ±15 |
| Solide | ±8 ou moins |
| Sûr | ±5 ou moins |

**Nombre de matchs nécessaires (simulation)**

| Scout | Pour « Solide » | Pour « Sûr » |
|---|---|---|
| Spécialité, œil 0 | 4 | 9 |
| Spécialité, œil 3 | 2 | 6 |
| Spécialité, œil 5 | 2 | 4 |
| Hors spécialité, œil 0 | 7 | 17 |
| Hors spécialité, œil 3 | 5 | 12 |
| Hors spécialité, œil 5 | 4 | 9 |

**Exemple : la Vitesse de Kofi** (vraie valeur 78, scout dans sa spécialité, œil 0)

| Matchs vus | Fourchette (exemple) | Largeur |
|---|---|---|
| 1 | 69 à 98 | 29 points |
| 3 | 71 à 88 | 17 points |
| 6 | 73 à 85 | 12 points |

Les traits cachés ne se voient presque jamais en match : ils viennent des entretiens et des sources (partie 5).
Seuls Grand match et Indiscipliné peuvent apparaître en match, 1 fois sur 10 par match.

## 5. Les sources et les entretiens

**Sources d'information**

| Source | Fiabilité | Biais |
|---|---|---|
| Le joueur | 0,6 | Minimise ses défauts |
| Les parents | 0,7 | Cachent une blessure 1 fois sur 2 |
| L'entraîneur des jeunes | 0,8 | Information dépassée 3 fois sur 10 |
| L'agent | 0,4 | Gonfle les attributs de +10, cache les défauts |
| Le kiné | 0,9 | Ne parle que des blessures |
| Un coéquipier | 0,65 | Discipline et mental |

Un trait devient **sûr** quand deux sources indépendantes le confirment, ou une source de fiabilité 0,9 ou plus.

**Déroulé d'un entretien**

- On tire 5 questions possibles, on en pose 3 (4 avec la compétence « Contact »).
- La **confiance** de chaque personne va de 0 à 5 et démarre à 2,5.

| Type de question | Information obtenue | Confiance |
|---|---|---|
| Directe | Beaucoup | −0,5 |
| Indirecte | Normale | 0 |
| Attentionnée | La moitié | +0,5 |

| Seuil de confiance | Effet |
|---|---|
| 3,5 ou plus | Réponses franches (le biais de la source disparaît) |
| 4 ou plus | Ouvre de nouveaux contacts (kiné, ancien entraîneur) |
| 1,5 ou moins | Plus d'entretien possible |

- Sans contact pendant 8 semaines : −0,5.
- Promesse tenue : +1. Promesse rompue : −2.

## 6. La fin d'une enquête : signe, signe pas

**Étape 1, le club décide après le rapport** (C = confiance du club en toi)

| Confiance du club | Décision |
|---|---|
| 70 ou plus | Suit ton avis, offre jusqu'à 110 % de la valeur |
| 40 à 69 | Offre prudente, jusqu'à 80 % de la valeur |
| Moins de 40 | Range le rapport, sauf si ta certitude est de 85 % ou plus |

**Étape 2, le joueur choisit entre les offres**

score = 0,30 × argent + 0,30 × exigences satisfaites + 0,25 × (confiance de la famille / 5) + 0,15 × prestige du club, plus un petit hasard de ±0,03. Chaque terme va de 0 à 1. Le plus haut score l'emporte.

**Exemple : Kofi hésite entre Famalicão et Benfica B**

| Critère | Famalicão | Benfica B |
|---|---|---|
| Argent | 0,60 → 0,180 | 0,80 → 0,240 |
| Exigences (temps de jeu, études) | 0,95 → 0,285 | 0,60 → 0,180 |
| Confiance de la famille | 4 sur 5 → 0,200 | 2,5 sur 5 → 0,125 |
| Prestige | 0,50 → 0,075 | 0,93 → 0,140 |
| **Score** | **0,74** | **0,685** |

Kofi signe à Famalicão. Si la confiance de la famille n'était que de 2, Famalicão tomberait à 0,64 et Kofi partirait à Lisbonne.
Les cinq leviers du joueur sont tous là : ton avis, la confiance de ton club, les rivaux (qui ajoutent des offres), les exigences du joueur et la confiance que tu as bâtie.

## 7. La carrière : deux jauges

**Confiance du club (C, de 0 à 100, départ à 50)**

| Événement | Effet |
|---|---|
| Avis confirmé par la suite | +8 |
| Avis démenti | −10 |
| Rapport en retard | −3 |
| Recrue chère qui échoue | −15 |
| Plus-value à la revente | +5 par million d'euros, 15 au plus |

| Seuil | Ce qui s'ouvre |
|---|---|
| 65 | Budget de la saison suivante +25 % |
| 75 et réputation 30 | Poste de chef scout proposé |
| 85 et réputation 60 | Directeur sportif possible |

**Réputation (R, de 0 à 100, départ à 5)** : elle te suit d'un club à l'autre.

| Événement | Effet |
|---|---|
| Ta découverte joue en première division | +3 |
| Transfert de plus de 5 M€ | +8 |
| Sélection en équipe nationale | +10 |
| Flop médiatisé | −5 |

| Seuil | Offres reçues |
|---|---|
| 25 | Clubs du même niveau |
| 45 | Clubs du niveau au-dessus |
| 70 | Grands clubs |

**Chef scout** : tu gères 2 à 4 scouts juniors, chacun avec son œil et son biais (par exemple +5 sur les attaquants rapides). Tu confirmes leurs rapports en allant voir toi-même.

## 8. Les rivaux

- Chaque joueur a un **buzz** de 0 à 100 (bons matchs, buts, sélection, réseaux sociaux).
- Prix demandé = valeur × (1 + buzz / 100).
- Chance de croiser un rival en tribune : à peu près buzz × intérêt du rival.

| Profil | Comportement |
|---|---|
| Le vétéran | Œil très sûr, réagit lentement |
| Le jeune loup | Réagit au buzz en une semaine |
| Le club riche | Offre ×1,4 dès que le buzz atteint 60 |

- Café entre scouts : on échange des tuyaux, vrais 6 fois sur 10. Un rival menteur donne 25 % de faux tuyaux en plus.

## 9. L'âge, la progression et la valeur

**Incertitude sur le potentiel selon l'âge**

| Âge | Écart possible du potentiel |
|---|---|
| 15 à 17 ans | ±20 |
| 18 à 20 ans | ±12 |
| 21 à 23 ans | ±6 |
| 24 ans et plus | 0 (le potentiel est atteint ou presque) |

**Progression d'une saison** = (potentiel − niveau) × r × temps de jeu + hasard (écart-type 3).

| Âge | r |
|---|---|
| 15 à 19 ans | 0,35 |
| 20 à 23 ans | 0,25 |
| 24 à 27 ans | 0,10 |
| 28 à 30 ans | 0 |
| 31 ans et plus | −2 à −5 par an sur Vitesse et Physique |

Temps de jeu : titulaire ×1,2, remplaçant ×0,8, réserve ×0,6.

**Exemple** : Kofi, 19 ans, niveau 65, potentiel 85, titulaire : (85 − 65) × 0,35 × 1,2 = +8,4, soit un niveau d'environ 73 la saison suivante.

**Valeur marchande** = 0,07 M€ × e^((N − 50) / 7), N étant le plus grand entre le niveau et la moyenne niveau-potentiel.
Âge : ×1,3 avant 21 ans, ×0,6 après 30 ans.

Kofi : N = max(65, 75) = 75, soit 2,5 M€, puis ×1,3 (19 ans), environ **3,2 M€**.

## 10. Les règles FIFA devenues règles de jeu

- **Aucun transfert international avant 18 ans**, sauf :
  - les parents déménagent pour une raison sans lien avec le football (événement rare, 5 % par saison) ;
  - transfert entre pays de l'UE ou de l'EEE entre 16 et 18 ans, si le club a un centre de formation reconnu ;
  - le joueur vit à moins de 50 km d'une frontière et le club à moins de 50 km de l'autre côté.
- 5 ans de résidence dans le pays permettent une première inscription.
- Contrat professionnel avant 18 ans : 3 ans au plus. Âge minimum : 16 ans par défaut, réglable par pays.

Pour le jeu : un prodige de 15 ans repéré au Ghana ne peut pas venir tout de suite. Il faut le **suivre pendant des saisons** et garder la confiance de sa famille. C'est là que se joue la patience du scout.

## 11. Une saison type en chiffres

Scout de **troisième division**, budget 15 000 €, 230 jours de travail.

| Poste | Nombre | Jours | Coût |
|---|---|---|---|
| Matchs dans la région | 30 | 30 | 2 400 € |
| Matchs dans le pays | 15 | 15 | 3 300 € |
| Matchs en Europe | 6 | 9 | 2 700 € |
| Voyages lointains | 2 | 7 | 4 400 € |
| Entretiens | 12 | 6 | 0 € |
| Rapports | 25 | 12,5 | 0 € |
| **Total** | | **79,5 jours** | **12 800 €** |

Il reste 2 200 € de réserve et environ 150 jours pour le reste : demandes du club, vidéo, réunions, cafés avec les rivaux, repos.
Le choix qui compte : deux voyages lointains coûtent autant que 55 matchs dans la région.

## 12. À régler en jouant

- La vitesse de chute de la confiance quand on ne voit plus une famille.
- La part du hasard dans le choix du joueur (±0,03 peut être trop faible).
- La fréquence des tuyaux de rivaux.
- Le nombre de demandes du club hors mercato.
