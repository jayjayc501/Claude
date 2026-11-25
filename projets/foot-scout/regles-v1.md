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

## 3. Le joueur : en match et hors match

Deux familles d'attributs, toutes notées de 1 à 100. Le **niveau** est la moyenne pondérée des attributs en match selon le poste. Le **potentiel** va de 40 à 99 et n'est jamais affiché directement.

**Attributs en match** (ce qu'on voit sur le terrain, à travers le brouillard de la partie 4) :

| Famille | Attributs |
|---|---|
| Physique | Vitesse, Physique |
| Technique | Technique, Passe, Finition |
| Jeu | Défense, Vision, Sang-froid (rester lucide sous la pression) |

**Attributs hors match** (la personne, presque invisibles en match ; on les découvre surtout en entretien et par les sources de la partie 5) :

| Attribut | La question qu'on se pose | Effet en jeu |
|---|---|---|
| Sérieux | Est-ce qu'il bosse à l'entraînement ? | Progression × (0,8 + Sérieux / 250), donc de ×0,8 à ×1,2 |
| Discipline | Est-ce qu'il fout la merde ? | Sous 30 : cartons, retards, clashs avec le coach ; un « incident » par saison avec 1 chance sur 3 |
| Humilité | Va-t-il se croire arrivé ? | Après un gros contrat ou un transfert : risque « Se croit arrivé » = (100 − Humilité) / 200 ; si ça arrive, progression ×0,5 jusqu'à ce qu'on le recadre |
| Ambition | Veut-il aller au plus haut ? | Progression ×1,1 au-dessus de 70, mais veut partir plus tôt |
| Adaptation | Supportera-t-il le départ ? | Première saison loin de chez lui : progression × (0,6 + Adaptation / 250) |
| Entourage | Sa famille et son agent l'aident-ils ou le gênent-ils ? | Sous 40 : exigences plus fortes, négociation plus dure |

**Traits rares** (0 ou 1 par joueur, tout ou rien) : Fragile (risque de blessure ×2), Grand match (forme +5 dans les matchs importants), Leader (fait progresser les jeunes autour de lui).

## 4. Le brouillard : ce que le scout voit

**Chaque match donne un indice par attribut observé** :
indice = vraie valeur + forme du jour (écart-type 5) + bruit du scout (écart-type s).

Un scout juge tous les postes de la même façon, de l'attaquant au gardien. Ce qui décide de la netteté de ce qu'il voit, c'est **son expérience**, de 0 à 5 : elle monte avec les saisons et les matchs vus.

- Bruit du scout : s = 12 − 1,5 × expérience, minimum 4 (de 12 pour un débutant à 4,5 au niveau 5).
- **Fourchette affichée** = moyenne des indices ± 1,3 × √(s² + 5²) / √n, n étant le nombre de matchs vus. Demi-largeur plafonnée à 30.
- Réglée ainsi, la vraie valeur tombe dans la fourchette **environ 8 fois sur 10** (simulation : 80 à 82 %). Le scout peut donc se tromper, et c'est voulu.
- Les attributs hors match suivent la même règle de fourchette, mais leurs indices viennent des entretiens et des sources ; l'expérience y est complétée par la compétence **Psychologie** du scout.

**Libellés de certitude**

| Libellé | Fourchette |
|---|---|
| Flou | plus de ±15 |
| Correct | ±9 à ±15 |
| Solide | ±8 ou moins |
| Sûr | ±5 ou moins |

**Nombre de matchs nécessaires (simulation)**

| Expérience du scout | Pour « Solide » | Pour « Sûr » |
|---|---|---|
| 0 (débutant) | 5 matchs | 12 matchs |
| 1 | 4 | 10 |
| 2 | 3 | 8 |
| 3 | 3 | 6 |
| 4 | 2 | 5 |
| 5 (vétéran) | 2 | 4 |

Autrement dit : un débutant a besoin de 5 matchs pour cerner un attribut, un vétéran de 2. L'expérience est donc la vraie progression du scout.

**Exemple : la Vitesse de Kofi** (vraie valeur 78, scout débutant, expérience 0)

| Matchs vus | Fourchette (exemple) | Largeur |
|---|---|---|
| 1 | 62 à 96 | 34 points |
| 3 | 69 à 89 | 20 points |
| 6 | 72 à 86 | 14 points |

Les attributs hors match et les traits rares ne se voient presque jamais en match : ils viennent des entretiens et des sources (partie 5). En match, on n'en voit que des signes, 1 fois sur 10 par match : un carton ou une dispute (Discipline), un repli à la 85e minute (Sérieux), un joueur qui remobilise les autres (Leader).

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

**Chef scout** : tu gères 2 à 4 scouts juniors, chacun avec son expérience et son biais (par exemple +5 sur les attaquants rapides). Tu confirmes leurs rapports en allant voir toi-même.

## 8. Les rivaux

Un rival = **un scout** (ses qualités à lui) **+ son club** (ses moyens et sa stratégie). On ne mélange plus les deux : c'est leur combinaison qui donne le comportement. Chaque région compte 4 à 8 rivaux, qu'on recroise toute la carrière.

**Les qualités du scout rival**

| Qualité | Échelle | Ce que ça change |
|---|---|---|
| Expérience | 0 à 5, comme toi (partie 4) | Il voit net ou flou, et peut se tromper lui aussi |
| Réseau | 0 à 100 | Vitesse à laquelle il entend parler d'un joueur : délai = 6 − Réseau / 20 semaines (de 1 à 6) |
| Audace | 0 à 100 | Haute : mise tôt sur des jeunes encore flous ; basse : attend la certitude |
| Relationnel | 0 à 100 | Sa confiance avec les familles ; il te concurrence dans les entretiens |
| Honnêteté | 0 à 100 | Part de vrais tuyaux au café : 40 % + Honnêteté × 0,5 |
| Réputation | 0 à 100 | Comme la tienne : il peut changer de club, monter ou chuter |

**Son club**

| Moyens du club | Budget de recrutement par saison | Offre maximale |
|---|---|---|
| Modeste | moins de 2 M€ | 0,7 × valeur |
| Moyen | 2 à 15 M€ | 0,9 × valeur |
| Aisé | 15 à 60 M€ | 1,2 × valeur |
| Très riche | plus de 60 M€ | 1,5 × valeur, dès que le buzz dépasse 60 |

La **stratégie** du club oriente les cibles : formation (moins de 20 ans), achat-revente (19 à 23 ans sous-cotés), résultats immédiats (joueurs confirmés).

**Le buzz et la concurrence**

- Chaque joueur a un **buzz** de 0 à 100 (bons matchs, buts, sélection, réseaux sociaux).
- Prix demandé = valeur × (1 + buzz / 100).
- Chance qu'un rival soit en tribune le même jour que toi : à peu près buzz / 100 × Réseau / 100, s'il cible ce profil.

**Exemples de rivaux qu'on peut croiser**

| Rival | Scout | Club | Comportement obtenu |
|---|---|---|---|
| « Le vieux Matos » | Expérience 5, Réseau 40, Audace 20 | Moyen, formation | Lent mais ne se trompe presque jamais |
| « Le jeune loup » | Expérience 1, Réseau 85, Audace 80 | Aisé, achat-revente | Arrive partout le premier, se trompe souvent |
| « Le charmeur » | Expérience 3, Relationnel 90, Honnêteté 30 | Modeste, formation | Ne peut pas payer, mais vole la confiance des familles |
| « Le carnet de chèques » | Expérience 2, Réseau 60, Audace 40 | Très riche, résultats | Arrive tard et surenchérit |
## 9. L'âge, la progression et la valeur

**Incertitude sur le potentiel selon l'âge**

| Âge | Écart possible du potentiel |
|---|---|
| 15 à 17 ans | ±20 |
| 18 à 20 ans | ±12 |
| 21 à 23 ans | ±6 |
| 24 ans et plus | 0 (le potentiel est atteint ou presque) |

**Progression d'une saison** = (potentiel − niveau) × r × temps de jeu × effet des attributs hors match (Sérieux, Ambition, Adaptation, « Se croit arrivé ») + hasard (écart-type 3).

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

## 10. Un monde qui vit tout seul

Le jeu tient une **base de données mondiale** d'environ 30 000 joueurs (de 15 à 38 ans, tous continents). Elle vit sans toi : des jeunes arrivent, d'autres éclosent, certains déclinent, d'autres prennent leur retraite. Des stars sortiront de partout, y compris là où tu n'es jamais allé.

**Deux niveaux de simulation**, pour que ça reste léger :

| | Joueurs simulés | Rythme | Ce qui est calculé |
|---|---|---|---|
| Monde | Tous (environ 30 000) | Une fois par saison, en S46 | Niveau, potentiel, club, valeur, retraite, transfert, une ligne de stats (matchs, buts) |
| Joueurs connus | Ceux de ton carnet : vus, signés, suivis (50 à 300) | Chaque semaine | Chaque attribut, forme, temps de jeu, blessures, événements hors match, lien avec toi |

Quand un joueur du monde entre dans ton radar (tu le vois jouer, on t'en parle), il passe au niveau détaillé : ses attributs sont tirés pour coller à son niveau et à son poste, et ses attributs hors match sont tirés à ce moment-là.

**Le cycle d'une saison du monde**

- **Arrivées** : chaque pays fait entrer une nouvelle génération de 15 ans, en nombre selon sa taille et son football (Brésil, France, Nigeria : beaucoup ; petits pays : peu). Environ 2 500 par saison dans le monde.
- **Progression** : la formule de la partie 9, simplifiée (sans le détail par attribut).
- **Éclosions et chutes** : 1 jeune sur 50 « explose » (potentiel +10 et buzz) ; 1 sur 30 stagne (potentiel −10). C'est ce qui fabrique des stars inattendues.
- **Mouvements** : les clubs du monde achètent et vendent entre eux selon leurs moyens et leur stratégie (comme les clubs des rivaux).
- **Retraites** : chance de 10 % à 33 ans, 30 % à 35 ans, 70 % à 37 ans ; plus tôt si le niveau est faible ou après une grave blessure.

**Tes ratés sont visibles.** En fin de saison, une page « Ceux qui ont explosé » montre les joueurs de ta région de travail devenus bons, avec une mention : « vu 2 fois, noté Correct », « jamais vu », ou « signé par le jeune loup ». C'est frustrant, et c'est ce qui donne envie de mieux faire.

## 11. Après la signature : suivre sa carrière

Une fois signé, le joueur ne disparaît pas. Il a une **fiche de suivi** et un **fil d'actualité** : minutes jouées, notes de match, buts, blessures, sélections, contrats, transferts, et les événements hors match (« Kofi a signé son premier contrat pro », « Kofi est arrivé en retard à l'entraînement »).

**Le lien avec le joueur et sa famille** (0 à 5) continue après la signature :

| Action | Coût | Effet sur le lien |
|---|---|---|
| Prendre des nouvelles (message, appel) | 0 jour, 3 par semaine au plus | +0,25, au plus une fois par mois et par joueur |
| Aller le voir jouer | 1 jour + trajet | +0,5, et resserre ses fourchettes |
| Être là au bon moment (blessure, premier match pro, départ) | 1 jour | +1 |
| Rien pendant 8 semaines | | −0,5 |

**Ce que rapporte un lien fort**

- **Alerte** : à 4 ou plus, il te prévient avant qu'un problème n'éclate (il veut partir, il ne joue pas, il ne s'entraîne plus).
- **Recadrer** : quand « Se croit arrivé » tombe, une visite le corrige avec une chance de lien / 5 × 0,6 (60 % au mieux).
- **Tuyaux** : il te parle de ses coéquipiers et adversaires prometteurs, ce qui ouvre de nouvelles pistes.
- **Fidélité** : devenu directeur sportif ailleurs, tu peux le faire venir avec un bonus au score de signature de +0,10 × lien / 5.
- **Réputation** : ses réussites comptent pour toi (partie 7), qu'il soit resté au club ou non.

**Revenir le voir** : tes fourchettes vieillissent. Pour un joueur de moins de 23 ans, chaque saison sans le revoir les élargit de 2 points, puisqu'il a changé. On le revoit donc pour savoir où il en est vraiment.
## 12. Les règles FIFA devenues règles de jeu

- **Aucun transfert international avant 18 ans**, sauf :
  - les parents déménagent pour une raison sans lien avec le football (événement rare, 5 % par saison) ;
  - transfert entre pays de l'UE ou de l'EEE entre 16 et 18 ans, si le club a un centre de formation reconnu ;
  - le joueur vit à moins de 50 km d'une frontière et le club à moins de 50 km de l'autre côté.
- 5 ans de résidence dans le pays permettent une première inscription.
- Contrat professionnel avant 18 ans : 3 ans au plus. Âge minimum : 16 ans par défaut, réglable par pays.

Pour le jeu : un prodige de 15 ans repéré au Ghana ne peut pas venir tout de suite. Il faut le **suivre pendant des saisons** et garder la confiance de sa famille. C'est là que se joue la patience du scout.

## 13. Une saison type en chiffres

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

## 14. À régler en jouant

- La vitesse de chute de la confiance quand on ne voit plus une famille.
- La part du hasard dans le choix du joueur (±0,03 peut être trop faible).
- La fréquence des tuyaux de rivaux.
- Le nombre de demandes du club hors mercato.
