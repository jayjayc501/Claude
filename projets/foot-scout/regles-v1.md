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
| Physique | Vitesse, Endurance, Puissance (duels, jeu aérien) |
| Technique | Dribble, Passe, Finition, Jeu de tête |
| Défense | Marquage, Tacle |
| Intelligence | Vision, Appels (se démarquer), Sang-froid (rester lucide sous la pression) |
| Gardien (à la place des autres) | Réflexes, Placement, Sorties, Jeu au pied |

Douze attributs pour un joueur de champ, quatre pour un gardien. La tablette montre d'abord une note par famille (comme les 6 notes d'une carte EA FC), puis le détail. Repères : EA FC affiche 6 notes et cache environ 29 attributs détaillés ; Football Manager en a 36 visibles et une dizaine de cachés. Ici, chaque attribut est une fourchette à resserrer : 12 donnent du relief sans rendre l'enquête fastidieuse.

**Un attribut ne se voit que si le match le sollicite.** À chaque match, chaque attribut a une chance d'être observé selon le poste et le match : 90 % pour ce qui fait le cœur du poste (Vitesse d'un ailier, Marquage d'un défenseur), 50 % en moyenne, 15 % pour ce qui sort du poste (Finition d'un défenseur central). Le tableau de la partie 4 compte donc des matchs où l'attribut a été vu, pas des matchs tout court.

**Les postes.** Douze postes classiques : G (gardien), DD, DC, DG (défenseurs droit, central, gauche), MDC (milieu défensif), MC (milieu central), MOC (milieu offensif), MD, MG (milieux droit et gauche), AD, AG (ailiers droit et gauche), BU (buteur).

Le **niveau** d'un joueur dépend du poste : c'est la moyenne de ses attributs, pondérée ainsi (les attributs non cités comptent ×0,5) :

| Poste | Comptent ×3 | Comptent ×2 |
|---|---|---|
| G | Réflexes, Placement | Sorties, Sang-froid (Jeu au pied ×1) |
| DC | Marquage, Tacle, Jeu de tête | Puissance, Sang-froid |
| DD, DG | Vitesse, Tacle, Endurance | Marquage, Passe, Dribble |
| MDC | Tacle, Marquage, Passe | Endurance, Vision, Sang-froid |
| MC | Passe, Vision, Endurance | Tacle, Dribble, Sang-froid |
| MOC | Vision, Passe, Dribble | Finition, Appels, Sang-froid |
| MD, MG | Vitesse, Dribble, Passe | Endurance, Appels |
| AD, AG | Vitesse, Dribble, Appels | Finition, Passe |
| BU | Finition, Appels, Sang-froid | Jeu de tête, Puissance, Vitesse |

**Plusieurs postes par joueur.** Chaque joueur a un poste principal et 0 à 2 postes secondaires, le plus souvent voisins (DD et MD, MC et MDC ou MOC, AD et BU…). À un poste secondaire, son niveau est calculé avec les poids de ce poste, moins 5 s'il y est à l'aise, moins 15 s'il dépanne. Le pied compte : un gaucher à droite (ailier « inversé ») n'a pas de malus, il rentre sur son bon pied.

Le scout ne découvre un poste secondaire qu'en voyant le joueur y jouer (son entraîneur le fait tourner environ 1 match sur 5) ou par une source, comme l'entraîneur des jeunes.

**Le pied fort.** Chaque joueur est droitier (environ 75 %), gaucher (20 %) ou ambidextre (5 %). Le pied fort se note dès le premier match, sans brouillard. Le **pied faible** va de 1 à 5 (1 : ne s'en sert jamais, 5 : les deux pieds) ; il se cerne en 3 matchs environ. Effet : avec un pied faible à 1 ou 2, Passe et Finition perdent 10 points quand le joueur est forcé sur son mauvais pied (environ 1 action sur 4). Un gaucher vaut 10 % de plus sur le marché, parce qu'il est plus rare.

**Les traits.** Règle de conception : un trait est **un effet dans une situation précise**, pas une simple grosse note (ça, ce sont les attributs). Environ 1 joueur sur 4 a un trait positif, 1 sur 5 un trait négatif ; très peu en ont plus de deux.

**Traits positifs** (11, +10 % de valeur chacun)

| Trait | Pour | Ce que le scout voit en match | Effet en jeu |
|---|---|---|---|
| Costaud | Champ | Gagne ses 1 contre 1 au physique, en attaque comme en défense | +8 en Puissance et Vitesse dans les 1 contre 1 |
| Magicien | Champ | Tente des gestes imprévisibles, qui ratent ou qui brillent | Sur ces gestes, 1 sur 2 rate et 1 sur 2 réussit à +10 ; buzz qui monte deux fois plus vite |
| Renard des surfaces | Champ | Toujours au bon endroit dans la surface | +8 en Appels et Finition dans la surface |
| Pied magique | Champ | Frappes de loin, coups francs et corners qui font mal | Frappe hors de la surface sans la pénalité habituelle de −10 ; chances de but sur coup franc direct doublées ; corners plus dangereux |
| Guerrier | Champ | Ne lâche rien, harcèle le porteur, récupère haut | +8 en Tacle et Marquage au pressing ; ne baisse pas en fin de match |
| Maître des airs | Tous | Champ : domine de la tête. Gardien : sort fort et capte les centres | Champ : +8 en Jeu de tête, danger sur corners. Gardien : +8 en Sorties sur les centres, corners adverses moins dangereux |
| Capitaine | Tous | Organise, parle, rassure l'équipe (le gardien place son mur) | +3 en Sang-froid pour les coéquipiers ; leur moral baisse moins vite |
| Se transcende | Tous | Élève son niveau dans les gros matchs | +6 sur tous ses attributs dans les gros matchs (derby, finale, sélection) |
| Gardien libéro | Gardien | Joue haut, sort loin, relance comme un milieu | +8 en Sorties et Jeu au pied hors de sa surface |
| Penalty | Gardien | Devine le côté, arrête les tirs au but | Arrête environ 40 % des penaltys au lieu de 20 % |
| Le Mur | Gardien | Arrêts réflexes sur sa ligne | +8 en Réflexes sur les frappes de près |

**Traits négatifs** (7)

| Trait | Pour | Ce que le scout voit | Effet | Valeur |
|---|---|---|---|---|
| Fragile | Tous | Se blesse souvent, absences longues | Risque de blessure ×2, absences 50 % plus longues | −20 % |
| Violent | Tous | Cartons, fautes bêtes, s'en prend à l'arbitre | Cartons ×3 ; un rouge tous les 10 matchs environ ; chez un gardien, un penalty concédé tous les 10 matchs | −10 % |
| Fébrile | Tous | Craque sous la pression, disparaît dans les gros matchs | −6 sur tous ses attributs dans les gros matchs et dans les fins de match serrées | −10 % |
| Maladroit | Tous | Champ : rate des occasions ou des passes faciles. Gardien : relâche les ballons, rate ses sorties, fait des boulettes | Champ : une action facile sur cinq ratée (Finition, Passe). Gardien : une frappe arrêtée sur cinq relâchée, une boulette qui coûte un but tous les 15 matchs | −10 % (gardien −15 %) |
| Irrégulier | Tous | Un grand match, puis trois matchs fantômes, sans raison | Forme du jour d'écart-type 12 au lieu de 5 ; il faut deux fois plus de matchs pour le cerner | −10 % |
| Perso | Champ | Joue pour lui : garde le ballon, ne fait pas les efforts sans ballon | Ne passe qu'une fois sur deux quand un coéquipier est mieux placé ; −8 en Marquage et Tacle au pressing, repli lent | −10 % |
| Pieds carrés | Gardien | Relance dangereuse, dégagements ratés | −10 en Jeu au pied ; une relance sur dix donne une occasion à l'adversaire | −10 % |

Fébrile et Irrégulier sont bien différents : le Fébrile baisse **quand ça compte** (on peut le prévoir), l'Irrégulier baisse **n'importe quand** (on ne peut pas le prévoir).

**Repérer un trait** : à chaque match où la situation se présente, il se montre 1 fois sur 3. La première fois, la tablette le note « possible » ; une deuxième fois dans un autre match, il est « confirmé ». Un très bon ou un très mauvais jour peut donner un faux « possible », d'où les deux matchs. Se transcende et Fébrile ne se voient que dans les gros matchs, qui sont rares : les sources (entraîneur, coéquipier) aident beaucoup. Fragile se confirme aussi par le kiné.

**Les traits évoluent** : un jeune peut gagner un trait positif si l'attribut lié dépasse 80 (5 % par trimestre) ; Capitaine peut naître après 24 ans si Sérieux et Sang-froid dépassent 70 (10 % par an). Costaud et Guerrier peuvent disparaître après 30 ans (10 % par an). Fragile peut apparaître après une grave blessure ou après 30 ans (10 % par an). Violent peut s'effacer si la Discipline remonte au-dessus de 60.

**Attributs hors match** (la personne, presque invisibles en match ; on les découvre surtout en entretien et par les sources de la partie 5) :

| Attribut | La question qu'on se pose | Effet en jeu |
|---|---|---|
| Sérieux | Est-ce qu'il bosse à l'entraînement ? | Progression × (0,8 + Sérieux / 250), donc de ×0,8 à ×1,2 |
| Discipline | Est-ce qu'il fout la merde ? | Sous 30 : cartons, retards, clashs avec le coach ; un « incident » par saison avec 1 chance sur 3 |
| Humilité | Va-t-il se croire arrivé ? | Après un gros contrat ou un transfert : risque « Se croit arrivé » = (100 − Humilité) / 200 ; si ça arrive, progression ×0,5 jusqu'à ce qu'on le recadre |
| Ambition | Veut-il aller au plus haut ? | Progression ×1,1 au-dessus de 70, mais veut partir plus tôt |
| Adaptation | Supportera-t-il le départ ? | Première saison loin de chez lui : progression × (0,6 + Adaptation / 250) |
| Entourage | Sa famille et son agent l'aident-ils ou le gênent-ils ? | Sous 40 : exigences plus fortes, négociation plus dure |

**Le hors match évolue, plus ou moins selon les joueurs.** Chaque trimestre, chaque attribut hors match bouge :

changement = (tendance de l'âge + événements de carrière) × souplesse du joueur

- **Souplesse** : un nombre propre à chaque joueur, tiré entre 0,2 et 1, puis multiplié par l'âge (×1 avant 21 ans, ×0,6 de 21 à 27 ans, ×0,3 après 28 ans). Environ 3 joueurs sur 10 ont un caractère presque figé (souplesse 0,2 à 0,35) : ce qu'on a vu à 16 ans restera vrai. Les autres peuvent changer beaucoup.

| Attribut | Tendance avec l'âge (par an) | Événements qui le font bouger |
|---|---|---|
| Sérieux | +2 jusqu'à 25 ans | Bon entraîneur ou mentor (+5) ; argent facile, mauvaise bande (−5 à −10) |
| Discipline | +3 jusqu'à 23 ans | Sanction du club (+5) ; conflit, injustice ressentie (−5) |
| Humilité | stable | Gros contrat, célébrité, buzz au-dessus de 80 (−10) ; échec, longue blessure, banc (+5 à +10) |
| Ambition | −2 après 30 ans | Titre, sélection (+5) ; série d'échecs (−5) |
| Adaptation | +1 | Expérience réussie à l'étranger (+10) ; expérience ratée (−10) |
| Entourage | stable | Changement d'agent, mariage, départ de chez les parents (±10 à ±20) |

Pour le scout, ça veut dire que **ses notes sur le caractère vieillissent aussi** : un rapport « sérieux, humble » fait à 16 ans peut être faux à 20 ans, après un premier gros contrat. Les fourchettes hors match s'élargissent de 5 points par saison sans nouvel entretien.

## 4. Le brouillard : ce que le scout voit

**Chaque match donne un indice par attribut observé** :
indice = vraie valeur + effet du moral + forme du jour (écart-type 5) + bruit du scout (écart-type s).

**L'état du moment : forme et moral.** D'un match à l'autre, un joueur ne joue pas toujours à son vrai niveau. Deux choses le font varier :

- **La forme du jour** (fatigue, petits pépins, adversaire) : un hasard de écart-type 5, différent à chaque match.
- **Le moral**, de 0 à 100, qui dure plusieurs semaines. Il se voit en quatre états :

| Moral | État | Effet sur ce qu'on voit en match |
|---|---|---|
| 80 à 100 | En confiance | +4 |
| 50 à 79 | Tout va bien | 0 |
| 25 à 49 | Dans le doute | −3 |
| 0 à 24 | Déprimé | −7 |

**Ce qui fait bouger le moral, chaque semaine** :

| Événement | Effet |
|---|---|
| Bon match, but, titularisation | +5 à +10 |
| Banc plusieurs semaines | −5 par semaine |
| Blessure | −15 |
| Ennuis familiaux, mal du pays (faible Adaptation) | −10 à −20 |
| Nouveau contrat, sélection | +15 |
| Visite ou message d'un proche (dont toi, si le lien est fort) | +5 |

Sans événement, le moral revient doucement vers 60 (un quart de l'écart par semaine).

**Le piège pour le scout** : un joueur déprimé paraît 7 points plus faible qu'il ne l'est. Si tu ne le sais pas, ta fourchette est faussée, et tu risques de rater une pépite qui traverse un mauvais mois. Si tu l'apprends (en entretien, par un proche, ou par des signes sur la tablette comme « tête basse, ne demande pas le ballon »), le jeu corrige la fourchette. À l'inverse, un joueur en confiance sur une série de matchs peut te faire surestimer son niveau.

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

Les attributs hors match ne se voient presque jamais en match : ils viennent des entretiens et des sources (partie 5). En match, on n'en voit que des signes, 1 fois sur 10 par match : un carton ou une dispute (Discipline), un repli à la 85e minute (Sérieux), un joueur qui remobilise les autres (Capitaine).

**Le match sur la tablette.** Pendant le match, le joueur ne fait rien d'autre que lire : il voit la tablette du scout se remplir, comme une caméra posée sur ses notes. Le match ne s'affiche jamais.

- Durée : **1 à 2 minutes** pour 90 minutes de jeu, avec pause et accélération (×2, ×4).
- Chaque indice de la partie 4 devient une note écrite à la minute où il tombe (« 23e : appel croisé, bien senti », « 57e : perd son duel, trop court physiquement »). Les signes d'un trait s'écrivent de la même façon (« 64e : encore un geste fou, raté »).
- Les joueurs remarqués sur le côté s'ajoutent dans la case « à revoir ».

**Ton verdict : le potentiel.** À la fin du match, c'est le joueur qui s'engage. Le jeu montre les fourchettes de niveau, l'âge et les traits notés, mais **jamais le potentiel** : on le donne soi-même, sous forme de fourchette, avec un curseur à deux poignées (de 40 à 99).

- On peut revoir sa fourchette après chaque nouveau match ou entretien. Celle qui compte est celle qu'on envoie au club dans le rapport.
- Le verdict est jugé quand le potentiel se révèle, vers 23 ans ou quand le joueur arrête de progresser :

| Résultat | Effet sur la confiance du club |
|---|---|
| Vrai potentiel dedans, fourchette de 10 points ou moins | Avis confirmé : +8 |
| Dedans, fourchette de 11 à 20 points | +4 |
| Dedans, fourchette de plus de 20 points | +1 : le club trouve ça trop prudent |
| Dehors | Avis démenti : −10 |

On a donc intérêt à s'engager serré, mais seulement quand on a assez vu.

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

**Les langues.** Le scout parle 2 langues au départ (le français et une autre, au choix). Un entretien dans une langue qu'il ne parle pas passe par un interprète : 150 € par entretien, la moitié de l'information, et des gains de confiance divisés par deux. Les familles parlent souvent la langue locale, même quand le joueur parle anglais.

Apprendre une langue prend une saison de cours, environ 2 demi-journées par mois, et 500 €. Le premier niveau supprime l'interprète, mais garde 20 % d'information en moins. Le second niveau, une saison plus tard, donne la pleine efficacité. Les langues ouvrent donc des régions : un scout qui parle portugais est chez lui au Brésil, au Portugal, en Angola et au Mozambique.

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
| 31 ans et plus | −2 à −5 par an sur Vitesse, Endurance et Puissance |

Temps de jeu : titulaire ×1,2, remplaçant ×0,8, réserve ×0,6.

**Exemple** : Kofi, 19 ans, niveau 65, potentiel 85, titulaire : (85 − 65) × 0,35 × 1,2 = +8,4, soit un niveau d'environ 73 la saison suivante.

**Valeur marchande** = 0,07 M€ × e^((N − 50) / 7), N étant le plus grand entre le niveau et la moyenne niveau-potentiel.
Âge : ×1,3 avant 21 ans, ×0,6 après 30 ans.

Kofi : N = max(65, 75) = 75, soit 2,5 M€, puis ×1,3 (19 ans), environ **3,2 M€**.

## 10. Un monde qui vit tout seul

Le jeu tient une **base de données mondiale** d'environ 30 000 joueurs (de 15 à 38 ans, tous continents). Elle vit sans toi : des jeunes arrivent, d'autres éclosent, certains déclinent, d'autres prennent leur retraite. Des stars sortiront de partout, y compris là où tu n'es jamais allé.

**Joueurs fictifs, clubs réels.** Tous les joueurs sont inventés, avec des noms tirés selon leur pays. Ça évite les questions de droits, et personne ne connaît les futures stars à l'avance. Les clubs, eux, sont réels (partie « Clubs » du concept).

**Deux niveaux de simulation**, pour que ça reste léger :

| | Joueurs simulés | Rythme | Ce qui est calculé |
|---|---|---|---|
| Monde | Tous (environ 30 000) | Chaque trimestre (S12, S23, S35, S46) | Niveau, potentiel, club, valeur, retraite, transfert, une ligne de stats (matchs, buts) |
| Joueurs connus | Ceux de ton carnet : vus, signés, suivis (50 à 300) | Chaque semaine | Chaque attribut, forme, temps de jeu, blessures, événements hors match, lien avec toi |

Quand un joueur du monde entre dans ton radar (tu le vois jouer, on t'en parle), il passe au niveau détaillé : ses attributs sont tirés pour coller à son niveau et à son poste, et ses attributs hors match sont tirés à ce moment-là.

**Pourquoi le trimestre** : chaque saison, ce serait trop lent (un joueur repéré en août ne bougerait pas avant mai) ; chaque mois, ce serait inutilement fin pour des joueurs que personne ne regarde. Le trimestre colle aux temps forts : fin de mercato d'été, mi-saison, mercato d'hiver, fin de saison.

**Pourquoi 30 000 joueurs** : c'est un premier réglage. Il correspond à environ 1 000 clubs à 30 joueurs, soit les deux premières divisions d'une soixantaine de pays et les meilleurs centres de formation.

- **Moins** (5 000) : le monde paraîtrait vide. On ferait vite le tour d'une région, et chaque pépite serait trouvée.
- **Plus** (100 000 et au-delà) : ça n'apporterait rien au jeu, puisqu'un scout ne voit que quelques centaines de joueurs par carrière ; la base serait juste plus lourde à télécharger.
- **Le calcul n'est pas le problème** : 30 000 joueurs mis à jour 4 fois par saison, c'est moins d'une seconde sur un téléphone. On pourra monter ou descendre selon ce qu'on ressent en jouant.

**Le cycle du monde, trimestre par trimestre**

- **Arrivées** : en début de saison (S1), chaque pays fait entrer une nouvelle génération de 15 ans, en nombre selon sa taille et son football (Brésil, France, Nigeria : beaucoup ; petits pays : peu). Environ 2 500 par saison dans le monde.
- **Progression** : la formule de la partie 9, simplifiée (sans le détail par attribut), un quart à chaque trimestre. Le moral du trimestre (partie 4) la fait varier.
- **Éclosions et chutes** : 1 jeune sur 50 « explose » (potentiel +10 et buzz) ; 1 sur 30 stagne (potentiel −10). C'est ce qui fabrique des stars inattendues.
- **Mouvements** : les clubs du monde achètent et vendent entre eux selon leurs moyens et leur stratégie (comme les clubs des rivaux).
- **Retraites** : décidées en fin de saison (S46), chance de 10 % à 33 ans, 30 % à 35 ans, 70 % à 37 ans ; plus tôt si le niveau est faible ou après une grave blessure.

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
