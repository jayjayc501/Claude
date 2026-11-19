# « Je te l'avais dit » — contexte pour reprendre le projet

*Mis à jour le 19 novembre 2026. À lire en premier dans une nouvelle conversation.*

## Le projet en bref

App mobile (Android d'abord, iPhone plus tard) : on **scelle une phrase datée** (une prédiction), elle devient non modifiable, et plus tard on l'**envoie** à quelqu'un avec une **carte d'authenticité** : « Regarde, je te l'avais dit. »

- Public : plutôt les jeunes (15-25 ans). Ton fun, complice, un peu taquin.
- Vocabulaire : **certitude** (et plus « prédiction », depuis le 19/11), esprit « t'en es sûr ? ».
- Plus de limite par jour depuis le 19/11 (garde-fou anti-abus invisible : 20 par jour). Envoi « après coup », quand on veut.
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
| Maquettes (copie) | `maquettes/` · version cliquable v2 **validée** (19/11, « à qui tu l'as dit » + signature) : https://claude.ai/artifact/KcMXxoMWFZcQ2vrLkT343o (v1 : https://claude.ai/artifact/GBrtiSGWzndyC5aD4Husvq) |
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

## 19 novembre 2026 : « à qui tu l'as dit » et signature sur place

Modèle **validé par le propriétaire sur les maquettes** (https://claude.ai/artifact/KcMXxoMWFZcQ2vrLkT343o), détail dans `cadrage.md` §4 bis :
- 03 Écrire → « Continuer » vérifie la phrase tout de suite (04 Refus si besoin) → 05 « Tu l'as dit à qui ? » : une case pour le lien (Pote, Best, Crush, Famille, Coloc, Collègue, Prof, Ex) et **un seul texte libre** (« Sarah », « ma petite sœur »), tous deux facultatifs, aperçu de la carte en direct, « Déjà dit à ». Pas de champs prénom / initiale, pas de jauge.
- 06 « C'est scellé ! » : en option (« FACULTATIF · Tu veux faire signer Sarah ? »), la personne signe du doigt dans une **zone noire** ; la signature est stockée comme **image (tracé SVG)**, une seule fois, dans les 15 minutes, avec sa propre empreinte.
- Vocabulaire : « certitude » (plus « prédiction ») ; écran vide : « Tu en es sûr ? ». **Aucun « il / elle »** dans les textes (on ne connaît pas le genre de la personne).
- Plus de limite d'une par jour (garde-fou invisible : 20 par jour), plus d'écran « reviens demain ».
- Carte reçue : « Sarah, Jules R. te l'avait dit il y a… », « Dit à Sarah · pote », « Signée par Sarah, sur place », « regarde, sarah. » ; plus de « 1 certitude sur N ».

**Code (branche `jetelavaisdit/temoin`, pull request n° 17)** : migration `20261119120000_temoin.sql` (colonnes `temoin`, `temoin_lien`, `temoin_signature`, `temoin_signee_le`, `empreinte_signature`, `afficher_lien` ; fonctions `jtlad_verifier_phrase`, `jtlad_sceller_phrase(p_texte, p_temoin, p_temoin_lien)`, `jtlad_signer_phrase(p_id, p_signature)`, `jtlad_reveler_phrase(p_id, p_afficher_lien)`, carte publique enrichie ; anciens appels toujours valides), testée sur PostgreSQL local ; app (`components/EtapeTemoin.tsx`, `components/Signature.tsx`, `lib/temoin.ts`, écrans Écrire, C'est scellé, Mes phrases, Partager) ; carte web.

**Fait le 19/11 vers 16 h 40 :** script `20261119120000_temoin.sql` appliqué sur la base par Claude (outil Supabase, migration `jtlad_temoin`). Vérifié : 6 nouvelles colonnes, contraintes, fonctions `jtlad_verifier_phrase`, `jtlad_sceller_phrase(text,text,text)`, `jtlad_signer_phrase(uuid,text)`, `jtlad_reveler_phrase(uuid,boolean)`, droits (anon lit la carte mais ne scelle pas), carte existante intacte (« Jérome J. / 9 j »), 1 phrase en base. L'ancienne contrainte « une par jour » est supprimée.

**Fait le 19/11 vers 16 h 45 :** pull request n° 17 fusionnée (commit `77315db`) ; version web mise en ligne (run 44557610202, succès) ; fabrication de l'APK lancée (run 44557689470 du workflow `jetelavaisdit-apk`, file Expo souvent ~1 h ; le lien apparaît dans les journaux du run : `APK : https://…`).

**À faire :** installer le nouvel APK par-dessus l'ancien, puis tester sur le téléphone : sceller avec / sans « à qui », faire signer, Mes phrases, partager, ouvrir la carte.

## Leçons apprises (pièges déjà rencontrés)

- **E-mails Supabase** : le service gratuit n'envoie que 2 e-mails par heure et ses modèles ne sont pas modifiables sans SMTP personnel → abandon de la connexion par e-mail au profit de Google.
- **Google** : écran de consentement en **External** et **publié** (pas « Interne »). Redirect URI : `https://joqzrjjgrntbyutytpnr.supabase.co/auth/v1/callback`.
- **Supabase › URL Configuration** : Site URL = `https://jayjayc501.github.io/Claude/app/` ; Redirect URLs = cette adresse + `jetelavaisdit://**` (retour dans l'app Android).
- **EAS / APK** : Node 22 obligatoire dans GitHub Actions ; `expo-splash-screen` exige une image ; la file d'attente gratuite d'Expo peut dépasser 45 minutes ; le lien de l'APK apparaît dans les journaux du run (`APK : https://…`) et sur expo.dev › Builds.
- **Installation Android** : si « Application non installée », désactiver temporairement Play Protect.
- **Environnement de Claude** : pas d'accès npm ni à expo.dev / supabase.co depuis le terminal ; on vérifie via GitHub Actions (build + typecheck) et un PostgreSQL local pour tester le SQL. L'outil Supabase permet aussi d'**appliquer** une migration (fait le 19/11) : toujours la tester en local d'abord.
- **Base mutualisée** : `auth.users` appartient à `supabase_auth_admin` ; le rôle `postgres` peut créer un déclencheur dessus mais pas le renommer → toujours le nommer avec le préfixe de l'appli dès sa création.
- **Règles du dépôt** : modification de code existant → branche + pull request ; le propriétaire dit « fusionne » pour valider.
- **Fonctions SQL appelées par l'app** : pour ajouter un paramètre, supprimer l'ancienne version et recréer avec des valeurs par défaut (deux versions en parallèle rendraient l'appel ambigu pour l'API) ; l'ancienne app continue ainsi de marcher.
- **Maquettes (type Design)** : une planche créée dans une autre session ne peut pas être modifiée ici → on en crée une nouvelle version.
- **Méthode avec le propriétaire** : pour une évolution visible, on itère d'abord sur les maquettes ; **pas de code avant sa validation explicite**.

## Prochaines étapes possibles

1. Installer le nouvel APK, vérifier prénom et jours sur la carte.
2. Image au format story (Instagram) à partager depuis l'app.
3. Notifications de rappel, qui citent la personne (« Yanis attend toujours ta preuve »).
4. Modération par IA.
5. Aperçu enrichi du lien dans WhatsApp (titre + image de la carte).
6. Points ouverts du cadrage : masquer une phrase, modèle économique.
7. Plus tard : compte Apple Developer → connexion Apple, TestFlight, App Store ; publication Play Store.
