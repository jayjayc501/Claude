# « Je l'avais dit » — Document de cadrage

*Version 2 — 10 novembre 2026*

## 1. Le concept en une phrase

Une app mobile (iPhone et Android) où l'on **scelle une phrase datée**, une prédiction ou une intuition, pour pouvoir **plus tard l'envoyer à quelqu'un** avec une jolie carte qui prouve : *« Regarde, je l'avais dit. »*

## 2. Positionnement

- **Simple, ludique, grand public.** Ce n'est pas un outil juridique : pas de blockchain, pas de tiers de confiance, pas de jargon.
- **L'horodatage est le cœur du produit.** La date de scellement est ce qui donne de la valeur à la phrase. Toute la technique reste invisible pour l'utilisateur.
- **Le ton :** complice, taquin, un peu fier, celui du copain qui avait raison.

## 3. Parcours utilisateur

### 3.1 Sceller une phrase
1. L'utilisateur se connecte.
2. Il écrit sa phrase. Exemple : *« Je te parie que Marc va démissionner avant l'été. »*
3. Il appuie sur **« Sceller »**.
4. La modération automatique vérifie la phrase (voir §5).
5. La phrase est enregistrée avec la date et l'heure du scellement. **Elle n'est plus modifiable ni supprimable.** À confirmer : l'utilisateur peut-il au moins la masquer ?
6. La phrase reste **privée** jusqu'à ce que l'utilisateur décide de l'envoyer.

### 3.2 Envoyer « Je l'avais dit ! »
1. Plus tard, quand la prédiction se réalise, l'utilisateur ouvre sa liste de phrases scellées.
2. Il choisit une phrase et appuie sur **« Je l'avais dit ! »**.
3. Il partage un **lien** par WhatsApp, SMS, réseaux sociaux, mail, etc.

### 3.3 Recevoir la carte (destinataire)
1. Le destinataire ouvre le lien dans son navigateur. **Il n'a pas besoin d'installer l'app.**
2. Il voit la **carte d'authenticité** (voir §4).
3. La page propose ensuite : *« À ton tour de sceller tes prédictions »*, avec des boutons vers l'App Store et Google Play.
4. Un bouton **« Signaler »** est disponible sur la carte.

## 4. La carte d'authenticité

Un visuel soigné et partageable, entre le diplôme et le ticket :
- la phrase ;
- **« Scellée le 10 novembre 2026 à 12h13 »** ;
- le nom ou pseudo de l'auteur ;
- un sceau ou tampon **« Authentique »** ;
- un indicateur discret de sincérité, par exemple *« 1 prédiction sur 12 scellées ce mois-ci »* ;
- l'invitation à installer l'app.

La crédibilité repose sur une règle simple : **l'app empêche de modifier ou d'antidater une phrase.**

## 5. Règles du jeu

| Règle | Décision | Pourquoi |
|---|---|---|
| Moment de l'envoi | **Après coup**, quand l'utilisateur le décide | Simplicité, c'est l'esprit du « je te l'avais dit » |
| Nombre de prédictions | **1 par jour maximum** | Chaque prédiction devient précieuse, et la triche est limitée |
| Modification | **Impossible** après scellement | C'est la base de la preuve |
| Accès du destinataire | **Lien web**, avec invitation à installer l'app | Aucune friction, et la viralité est intégrée |
| Modération | **Automatique** au scellement, plus signalement sur la carte | Éviter insultes, harcèlement et menaces |

### Triche par sélection (risque connu)
Même avec 1 prédiction par jour, on peut écrire « Marc va démissionner » lundi et le contraire mardi, puis ne montrer que la bonne. Le fait d'afficher le nombre de prédictions scellées sur la carte atténue ce risque sans compliquer l'app.

### Modération automatique
- **Au moment du scellement**, une IA analyse la phrase.
- Elle refuse les insultes, le harcèlement, les menaces, les propos haineux et les données personnelles (adresse, numéro de téléphone…).
- En cas de refus, l'utilisateur reçoit un message clair et bienveillant, et peut reformuler.
- Le bouton **« Signaler »** sur la carte reçue sert de filet de sécurité, avec une vérification manuelle si besoin.

## 6. Pistes techniques (à valider)

- **App mobile :** une seule base de code pour iPhone et Android, avec React Native (Expo) ou Flutter.
- **Backend :** Supabase ou Firebase pour les comptes, la base de données et la date de scellement **fixée par le serveur**, jamais par le téléphone.
- **Page web de la carte :** un site léger, avec un aperçu soigné quand le lien est partagé sur WhatsApp et les réseaux.
- **Modération :** une API de modération par IA.
- **Robustesse invisible :** une empreinte (hash) de chaque phrase est stockée au scellement, pour détecter toute modification. L'utilisateur n'en voit rien.

## 7. Forces et risques

**Forces**
- L'émotion est universelle : tout le monde aime avoir raison.
- Le concept s'explique en une phrase.
- La viralité est naturelle : chaque envoi fait découvrir l'app.

**Risques**
- **Usage peu fréquent.** On écrit, puis on attend des mois, et l'app risque d'être oubliée. C'est le risque principal.
- **Concurrence indirecte :** notes datées, mails à soi-même, vieux messages sur les réseaux.
- **Modèle économique** encore à définir.

## 8. Points encore ouverts

- [x] **Public visé en priorité :** plutôt les jeunes (15-25 ans environ). *Décidé le 10/11/2026.*
- [x] **Style visuel :** fun et coloré (violet, jaune, crème, contours épais, sceau façon autocollant). *Décidé le 10/11/2026.* Maquettes : https://claude.ai/artifact/GBrtiSGWzndyC5aD4Husvq
- [ ] **Rétention :** comment faire revenir l'utilisateur pendant l'attente ? Piste : un rappel *« Il y a 6 mois, tu as scellé ceci… Ça s'est réalisé ? »*
- [ ] **Masquage :** peut-on cacher une phrase de sa liste, sans la supprimer ?
- [x] **Connexion :** Apple et Google uniquement, sans mot de passe. *Décidé le 10/11/2026.*
- [ ] **Modèle économique :** gratuit avec publicité ? cartes premium ? (peut attendre)
- [ ] **Nom définitif et identité visuelle.**

## 9. Prochaines étapes

1. Trancher les points encore ouverts du §8.
2. ~~Maquettes des écrans principaux~~ : première version faite (connexion, écrire, scellé, refus de modération, mes phrases, carte reçue). À valider.
3. Prototype.
