# Je l'avais dit

App mobile (iPhone et Android) pour sceller une phrase datée et l'envoyer plus tard à quelqu'un avec une carte d'authenticité : « Regarde, je l'avais dit. »

**État :** prototype en ligne en version web : https://jayjayc501.github.io/Claude/app/ (mise à jour automatique à chaque modification sur `main`).

## Contenu

| Dossier / fichier | Rôle |
|---|---|
| [`cadrage.md`](cadrage.md) | Concept, parcours, règles, pistes techniques, points ouverts |
| [`maquettes/`](maquettes/) | Copie des 11 écrans et de la planche logo. Version cliquable : https://claude.ai/artifact/GBrtiSGWzndyC5aD4Husvq |
| [`supabase/migrations/`](supabase/migrations/) | Base de données : tables, sécurité, scellement, carte publique |
| [`mobile/`](mobile/) | L'app (Expo / React Native, iPhone + Android) |
| [`web/carte/`](web/carte/) | Page web que voit le destinataire du lien, sans installer l'app |

## Ce que fait le prototype

- Connexion **avec Google**, sans mot de passe.
- **Sceller une phrase**, une par jour maximum (heure de Paris). La date est fixée par le serveur et une empreinte SHA-256 est enregistrée. Une phrase scellée ne peut plus être modifiée ni supprimée.
- **Modération de base** : refus des insultes courantes, des numéros de téléphone et des e-mails.
- Écran **« c'est scellé »** avec animation et vibration.
- Écran **« reviens demain »** avec compte à rebours quand la prédiction du jour est utilisée.
- **Mes phrases** : statistiques, filtres, bulle-compteur des jours, rose pour les phrases révélées, écran vide au premier lancement.
- **Partage** : « Je l'avais dit ! » crée un lien public et ouvre le menu de partage du téléphone (WhatsApp, Messages, Instagram, copier…).
- **Page web de la carte** : affiche la phrase, l'auteur, le nombre de jours, la date et l'empreinte.

Pas encore fait : connexion Apple (à la publication sur l'App Store), image au format story, notifications de rappel, modération par IA, aperçu enrichi du lien dans WhatsApp.

## Lancer le prototype

La version web est mise en ligne automatiquement par GitHub (`.github/workflows/jelavaisdit.yml`) à chaque modification sur `main` :

- l'app : https://jayjayc501.github.io/Claude/app/
- la page de la carte : https://jayjayc501.github.io/Claude/carte/

### 1. La base de données (Supabase, gratuit)

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Ouvrir **SQL Editor**, coller le contenu de `supabase/migrations/20261110120000_init.sql` et l'exécuter.
3. **Authentication › URL Configuration** : mettre `https://jayjayc501.github.io/Claude/app/` en **Site URL** et dans **Redirect URLs**.
4. Reporter l'URL du projet et la clé publique (`anon` / `publishable`) dans `mobile/.env.example` et `web/carte/config.js` (déjà fait pour ce projet).

### 2. La connexion avec Google (gratuite)

La connexion se fait **uniquement avec Google** (Apple sera ajouté à la publication sur l'App Store, car il demande un compte Apple Developer payant).

1. Sur [console.cloud.google.com](https://console.cloud.google.com), créer un projet.
2. **APIs & Services › OAuth consent screen** : type *External*, nom « Je l'avais dit », e-mail de contact.
3. **Credentials › Create credentials › OAuth client ID** : type *Web application*. Dans *Authorized redirect URIs*, ajouter `https://joqzrjjgrntbyutytpnr.supabase.co/auth/v1/callback`.
4. Copier le *Client ID* et le *Client secret* dans Supabase : **Authentication › Sign In / Providers › Google**, activer et enregistrer. Le *Client secret* ne doit jamais être mis dans le dépôt.

### 3. L'app mobile

```bash
cd projets/jelavaisdit/mobile
cp .env.example .env        # valeurs publiques déjà remplies
npm install
npx expo install --fix      # aligne les versions des paquets sur le SDK Expo
npx expo start
```

Scanner le QR code avec l'app **Expo Go** (iPhone ou Android).

## Identité

- Logo : la « bulle scellée » (bulle de parole fermée par un cadenas, avec un « ! »).
- Signature : la bulle-compteur (le logo avec le nombre de jours dedans).
- Couleurs : fond #0D0C12, vert #C8FF3D (agir), rose #FF4FA3 (phrase révélée), gris #1A1922 (en attente).
- Typos : Unbounded (titres, chiffres), Inter (textes).
