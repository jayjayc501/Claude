# Serveur du 1 contre 1 (15/11)

Le match d'une partie en ligne est calculé ici, pas sur les téléphones.

- **Projet Supabase** : `foot-merge-tactic` (id `jcbqeoyygozmtixlorvf`, région Paris, offre gratuite).
- **Fonction** `partie` : https://jcbqeoyygozmtixlorvf.supabase.co/functions/v1/partie (POST, corps JSON envoyé en `text/plain`).
  `verify_jwt` désactivé : pas de clé côté téléphone, la fonction vérifie elle-même le jeton de chaque joueur.
- **Table** `public.parties` (une ligne par partie, le document dans `donnees`, `version` sert de verrou) ;
  RLS activée, aucune politique : seule la fonction (clé de service) y touche.
  `parties_essai_15_11` : table vide du premier essai, mise de côté (à supprimer quand le concepteur le voudra).
- **Films** : compartiment privé `films` (`<partie>-<secret>/mt1.bin`, `mt2.bin`), lus par la fonction seulement.
- Fonction `essai` : vérification de l'environnement du 15/11, retirée (répond 410).

## Fichiers

- `src/enligne/serveur.ts` : la logique (états de la partie, chronos, calculs, verrou).
- `src/enligne/fonction.ts` : HTTP et stockage Supabase.
- `moteur.js` : les deux, avec le moteur et les données, en un seul fichier (`bun run scripts/construire-serveur.ts`) ; `moteur.sha256` : son empreinte.
- `fonction/index.ts` : la fonction déployée sur Supabase. Elle charge `moteur.js` depuis GitHub **à un commit précis** et vérifie l'empreinte.

## Publier une nouvelle version du serveur

1. `bun run scripts/construire-serveur.ts` (puis `bun test`).
2. Committer `serveur/moteur.js` et `serveur/moteur.sha256`, pousser.
3. Dans `fonction/index.ts`, mettre le commit poussé dans `SOURCE` et l'empreinte dans `EMPREINTE`.
4. Déployer `fonction/index.ts` comme fonction `partie` (outil Supabase `deploy_edge_function`, `verify_jwt: false`), puis committer `fonction/index.ts`.

Vérifier depuis SQL (l'environnement de Claude ne joint pas Supabase directement ; extension `http`) :

```sql
select status, content from extensions.http_post('https://jcbqeoyygozmtixlorvf.supabase.co/functions/v1/partie', '{"action":"creer"}', 'text/plain');
```

## Essayer sans Supabase

```bash
bun run construire && bun run scripts/serveur-local.ts 8787
# deux navigateurs sur http://127.0.0.1:8787/?serveur=http://127.0.0.1:8787/api
python3 scripts/capture/un-contre-un.py "http://127.0.0.1:8787/?serveur=http://127.0.0.1:8787/api" /tmp/1c1
```
