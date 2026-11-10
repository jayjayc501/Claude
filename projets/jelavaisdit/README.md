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

- Connexion sans mot de passe, par **code reçu par e-mail** (Apple / Google viendront avant la publication).
- **Sceller une phrase**, une par jour maximum (heure de Paris). La date est fixée par le serveur et une empreinte SHA-256 est enregistrée. Une phrase scellée ne peut plus être modifiée ni supprimée.
- **Modération de base** : refus des insultes courantes, des numéros de téléphone et des e-mails.
- Écran **« c'est scellé »** avec animation et vibration.
- Écran **« reviens demain »** avec compte à rebours quand la prédiction du jour est utilisée.
- **Mes phrases** : statistiques, filtres, bulle-compteur des jours, rose pour les phrases révélées, écran vide au premier lancement.
- **Partage** : « Je l'avais dit ! » crée un lien public et ouvre le menu de partage du téléphone (WhatsApp, Messages, Instagram, copier…).
- **Page web de la carte** : affiche la phrase, l'auteur, le nombre de jours, la date et l'empreinte.

Pas encore fait : connexion Apple / Google, image au format story, notifications de rappel, modération par IA, aperçu enrichi du lien dans WhatsApp.

## Lancer le prototype

### 1. La base de données (Supabase, gratuit)

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Ouvrir **SQL Editor**, coller le contenu de `supabase/migrations/20261110120000_init.sql` et l'exécuter.
3. **Authentication › URL Configuration** : mettre `https://jayjayc501.github.io/Claude/app/` en **Site URL** et dans **Redirect URLs**. Le lien reçu par e-mail ramène alors sur l'app, déjà connecté.
   (Pour recevoir plutôt un code à 6 chiffres, il faut configurer un serveur d'e-mail à soi, « custom SMTP », puis ajouter `{{ .Token }}` dans les modèles « Confirm signup » et « Magic Link ».)
4. Noter, dans **Project Settings › API**, l'URL du projet et la clé `anon` (publique).

### 2. La page web de la carte

1. Remplir `web/carte/config.js` avec l'URL et la clé `anon`.
2. Mettre le dossier `web/carte/` en ligne (Netlify, Vercel, GitHub Pages…).
3. Noter l'adresse obtenue, par exemple `https://monsite.netlify.app/`.

### 3. L'app mobile

```bash
cd projets/jelavaisdit/mobile
cp .env.example .env        # puis remplir les 3 valeurs
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
