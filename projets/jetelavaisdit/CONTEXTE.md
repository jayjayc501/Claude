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
| Base Supabase | projet `myproject` (ex-`jelavaisdit`) / `joqzrjjgrntbyutytpnr` (https://joqzrjjgrntbyutytpnr.supabase.co), **mutualisé** avec MyFlix et les projets à venir : chaque appli préfixe ses objets. « Je te l'avais dit » = `jtlad_…` (tables `jtlad_profils`, `jtlad_phrases`, `jtlad_moderation_mots`, fonctions `jtlad_sceller_phrase`, `jtlad_reveler_phrase`, `jtlad_carte_publique`…). Ne jamais toucher aux autres préfixes (`myflix_…`). Les comptes (`auth.users`) sont communs à toutes les applis |
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

**En attente — à faire en premier dans la prochaine session :**
1. **Deux migrations NON appliquées sur Supabase, à appliquer ensemble et dans l'ordre** :
   - `supabase/migrations/20261114120000_noms_et_jours.sql` : prénom / nom de l'auteur (« Jérôme J. » sur la carte) et **bug des jours** corrigé (la carte comptait jusqu'au premier envoi → « 0 jour » ; elle compte maintenant jusqu'à aujourd'hui).
   - `supabase/migrations/20261117120000_prefixe_jtlad.sql` (17/11) : base mutualisée, tout ce qui est à « Je te l'avais dit » prend le préfixe `jtlad_` (tables, index, contraintes, fonctions). Données, droits et RLS conservés. Testé sur un PostgreSQL local imitant Supabase (parcours complet : inscription, modération, scellement, envoi, carte, droits).
   - Méthode : le propriétaire colle le script combiné (les deux fichiers dans une seule transaction, envoyé dans la conversation du 17/11 ; à défaut, coller les deux fichiers l'un après l'autre) dans **Supabase › SQL Editor › Run** et confirme l'avertissement « destructive » (`drop function`). Si l'erreur `relation "public.profils" does not exist` apparaît, c'est que c'est déjà fait.
   - ⚠️ Les outils Supabase `apply_migration` / `execute_sql` en écriture demandent une confirmation que l'app du propriétaire **annule automatiquement**. Les requêtes en lecture seule fonctionnent.
   - Les deux déclencheurs sur `auth.users` sont renommés en `jtlad_…` seulement si Supabase l'autorise (`auth.users` n'appartient pas au rôle `postgres`) ; sinon ils gardent leur nom (`profil_a_l_inscription`, `noms_a_la_connexion`) mais appellent bien les fonctions `jtlad_…`. À vérifier après application.
2. **Pull request #16 (« préfixe jtlad_ ») à fusionner juste après le script SQL** : elle contient #7 (image de démarrage + icône Android) et #12 (prénom, jours, textes plus fun) et fait appeler `jtlad_…` par l'app et la carte. La fusionner suffit ; fermer ensuite #7 et #12. Entre le script SQL et la fusion, la version web et la carte en ligne ne marchent pas : enchaîner les deux.
3. **APK à refabriquer après la fusion** (workflow `jetelavaisdit-apk.yml`) : l'APK installé et le dernier APK fabriqué (#12) appellent les anciens noms et cessent de marcher dès le script SQL.

**Données en base (17/11)** : 2 comptes, 1 phrase scellée et envoyée.

## Leçons apprises (pièges déjà rencontrés)

- **E-mails Supabase** : le service gratuit n'envoie que 2 e-mails par heure et ses modèles ne sont pas modifiables sans SMTP personnel → abandon de la connexion par e-mail au profit de Google.
- **Google** : écran de consentement en **External** et **publié** (pas « Interne »). Redirect URI : `https://joqzrjjgrntbyutytpnr.supabase.co/auth/v1/callback`.
- **Supabase › URL Configuration** : Site URL = `https://jayjayc501.github.io/Claude/app/` ; Redirect URLs = cette adresse + `jetelavaisdit://**` (retour dans l'app Android).
- **EAS / APK** : Node 22 obligatoire dans GitHub Actions ; `expo-splash-screen` exige une image ; la file d'attente gratuite d'Expo peut dépasser 45 minutes ; le lien de l'APK apparaît dans les journaux du run (`APK : https://…`) et sur expo.dev › Builds.
- **Installation Android** : si « Application non installée », désactiver temporairement Play Protect.
- **Environnement de Claude** : pas d'accès npm ni à expo.dev / supabase.co depuis le terminal ; on vérifie via GitHub Actions (build + typecheck), un PostgreSQL local pour tester le SQL, et l'outil Supabase en lecture.
- **Règles du dépôt** : modification de code existant → branche + pull request ; le propriétaire dit « fusionne » pour valider.

## Prochaines étapes possibles

1. Appliquer la migration, fusionner #12, vérifier prénom et jours sur la carte.
2. Image au format story (Instagram) à partager depuis l'app.
3. Notifications de rappel (« Il y a 6 mois, tu as scellé… Ça s'est réalisé ? »).
4. Modération par IA.
5. Aperçu enrichi du lien dans WhatsApp (titre + image de la carte).
6. Points ouverts du cadrage : masquer une phrase, modèle économique.
7. Plus tard : compte Apple Developer → connexion Apple, TestFlight, App Store ; publication Play Store.
