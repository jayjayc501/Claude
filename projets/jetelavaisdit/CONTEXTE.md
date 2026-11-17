# « Je te l'avais dit » — contexte pour reprendre le projet

*Mis à jour le 17 novembre 2026. À lire en premier dans une nouvelle conversation.*

## Le projet en bref

App mobile (Android d'abord, iPhone plus tard) : on **scelle une phrase datée** (une prédiction), elle devient non modifiable, et plus tard on l'**envoie** à quelqu'un avec une **carte d'authenticité** : « Regarde, je te l'avais dit. »

- Public : plutôt les jeunes (15-25 ans). Ton fun, complice, un peu taquin.
- Une prédiction par jour maximum (heure de Paris). Envoi « après coup », quand on veut.
- Le destinataire voit la carte via un simple lien web, sans installer l'app.
- Tout est stocké **sur le serveur** (Supabase) ; le téléphone ne fait qu'afficher.

Documents : [`cadrage.md`](cadrage.md) (décisions détaillées), [`README.md`](README.md) (mode d'emploi technique).

## Où sont les choses

| Quoi | Où |
|---|---|
| Code | `projets/jetelavaisdit/` dans le dépôt GitHub `jayjayc501/Claude` |
| App mobile (Expo / React Native) | `mobile/` |
| Base de données (migrations SQL) | `supabase/migrations/` |
| Page web de la carte reçue | `web/carte/` |
| Maquettes (copie) | `maquettes/` · version cliquable : https://claude.ai/artifact/GBrtiSGWzndyC5aD4Husvq |
| Version web en ligne | https://jayjayc501.github.io/Claude/app/ (carte : `/Claude/carte/?c=…`) |
| Base Supabase | projet `claude_projets` (ex-`jelavaisdit`) / `joqzrjjgrntbyutytpnr` (https://joqzrjjgrntbyutytpnr.supabase.co), **mutualisé** avec MyFlix et les projets à venir : chaque appli préfixe ses objets. « Je te l'avais dit » = `jtlad_…` (tables `jtlad_profils`, `jtlad_phrases`, `jtlad_moderation_mots`, fonctions `jtlad_sceller_phrase`, `jtlad_reveler_phrase`, `jtlad_carte_publique`…). Ne jamais toucher aux autres préfixes (`myflix_…`). Les comptes (`auth.users`) sont communs à toutes les applis |
| Compte Expo | `jayjayc501`, projet `jetelavaisdit` (fabrication de l'APK) |
| Mise en ligne web | `.github/workflows/jetelavaisdit.yml` (à chaque push sur `main`) |
| Fabrication de l'APK | `.github/workflows/jetelavaisdit-apk.yml` (lancement manuel, secret `EXPO_TOKEN`) |

Valeurs publiques (URL Supabase, clé `sb_publishable_…`) : déjà dans `mobile/.env.example`, `mobile/eas.json` et `web/carte/config.js`. Aucun secret dans le dépôt (le Client secret Google est uniquement dans Supabase, le jeton Expo uniquement dans les secrets GitHub).

## Identité visuelle

- Logo : la « bulle scellée » (bulle de parole fermée par un cadenas, avec un « ! »).
- Signature : la **bulle-compteur** (le logo avec le nombre de jours dedans, vert, penché).
- Mode sombre. Couleurs : fond `#0D0C12`, vert `#C8FF3D` = agir, rose `#FF4FA3` = phrase révélée, gris `#1A1922` = en attente.
- Typos : Unbounded (titres, chiffres, en minuscules) + Inter (textes).

## État au 17 novembre 2026

**Fonctionne (testé par le propriétaire sur Android) :**
- Connexion **avec Google uniquement** (Apple plus tard : compte Apple Developer payant).
- Écrire et sceller une phrase, limite d'une par jour, modération de base (insultes, téléphones, e-mails).
- Mes phrases, partage d'un lien, page web de la carte.
- APK Android installable (fabriqué par EAS).

**Fait le 17/11 vers 15 h 45 :**
- Base mutualisée : le propriétaire a renommé le projet Supabase `claude_projets` et collé le script SQL (migrations `20261114120000_noms_et_jours.sql` + `20261117120000_prefixe_jtlad.sql` en une transaction). Vérifié : tables et fonctions en `jtlad_…`, données intactes (2 profils, 1 phrase, 18 mots), carte publique « Jérome J. / 7 j ».
- Les deux déclencheurs sur `auth.users` **gardent leur nom** (`profil_a_l_inscription`, `noms_a_la_connexion` : Supabase refuse de les renommer) et appellent bien `jtlad_creer_profil` / `jtlad_completer_noms`.
- Pull request #16 fusionnée (contient #7 et #12, marquées fusionnées) ; version web mise en ligne ; nouvel APK fabriqué (lien ci-dessous).

**En attente — à faire en premier dans la prochaine session :**
1. **Installer le nouvel APK** (fabriqué le 17/11 après la fusion de #16, prêt vers 16 h 55 après environ 1 h 10 de file Expo) : https://expo.dev/artifacts/eas/yaTwe4oP5XzRmzfEtWZm6CcSBuWTqh4gCkz2YtLDl2Y.apk — lien valable environ deux semaines. L'installer par-dessus l'ancien, qui appelle les anciens noms et **ne marche plus**.
2. Vérifier sur le téléphone : connexion Google, sceller, envoyer, carte avec prénom et bon nombre de jours.

**Données en base (17/11)** : 2 comptes (1 avec prénom / nom repris de Google), 1 phrase scellée et envoyée.

## Leçons apprises (pièges déjà rencontrés)

- **E-mails Supabase** : le service gratuit n'envoie que 2 e-mails par heure et ses modèles ne sont pas modifiables sans SMTP personnel → abandon de la connexion par e-mail au profit de Google.
- **Google** : écran de consentement en **External** et **publié** (pas « Interne »). Redirect URI : `https://joqzrjjgrntbyutytpnr.supabase.co/auth/v1/callback`.
- **Supabase › URL Configuration** : Site URL = `https://jayjayc501.github.io/Claude/app/` ; Redirect URLs = cette adresse + `jetelavaisdit://**` (retour dans l'app Android).
- **EAS / APK** : Node 22 obligatoire dans GitHub Actions ; `expo-splash-screen` exige une image ; la file d'attente gratuite d'Expo peut dépasser 45 minutes ; le lien de l'APK apparaît dans les journaux du run (`APK : https://…`) et sur expo.dev › Builds.
- **Installation Android** : si « Application non installée », désactiver temporairement Play Protect.
- **Environnement de Claude** : pas d'accès npm ni à expo.dev / supabase.co depuis le terminal ; on vérifie via GitHub Actions (build + typecheck), un PostgreSQL local pour tester le SQL, et l'outil Supabase en lecture.
- **Base mutualisée** : `auth.users` appartient à `supabase_auth_admin` ; le rôle `postgres` peut créer un déclencheur dessus mais pas le renommer → toujours le nommer avec le préfixe de l'appli dès sa création.
- **Règles du dépôt** : modification de code existant → branche + pull request ; le propriétaire dit « fusionne » pour valider.

## Prochaines étapes possibles

1. Installer le nouvel APK, vérifier prénom et jours sur la carte.
2. Image au format story (Instagram) à partager depuis l'app.
3. Notifications de rappel (« Il y a 6 mois, tu as scellé… Ça s'est réalisé ? »).
4. Modération par IA.
5. Aperçu enrichi du lien dans WhatsApp (titre + image de la carte).
6. Points ouverts du cadrage : masquer une phrase, modèle économique.
7. Plus tard : compte Apple Developer → connexion Apple, TestFlight, App Store ; publication Play Store.
