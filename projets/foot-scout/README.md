# Foot Scout

Jeu mobile de foot où l'on ne joue pas les matchs : on commence scout avec un carnet
et une région, et l'on finit directeur sportif d'un grand club. Le cœur du jeu est le
brouillard : la valeur d'un joueur s'affiche en fourchette, et chaque observation la resserre.

État : **conception** (pas de prototype de jeu pour l'instant, choix du propriétaire le 24/11/2026).

- Document de conception (Claude Doc) : https://claude.ai/artifact/FZc7EZMYKEyiMo7dwxD9cE
  (moteur, boucles de motivation, petit plus, modes de jeu, scène de détection, fiche du match).
- Décision du 24/11 : jeu **hybride** = carrière solo à son rythme + une pépite commune chaque
  semaine avec classement des verdicts.
- Pas de vidéos Kling de joueurs en action (rendu jugé trop mauvais) : l'action est dessinée au
  crayon par le jeu ; Kling seulement pour les ambiances (stades, tribunes, portraits, lieux).

## maquette-carnet/

Maquette légère du carnet à pages qu'on tourne : fiche d'identité, notes brutes d'un match
(terrain entier, cages des frappes), fiche du match, notes d'entretien, synthèse. Une seule page HTML.
Copie en ligne sur claude.ai : https://claude.ai/artifact/AxihFiSz3mvXjW2zqimnNi

## maquette-tablette/

Variante moderne du même dossier (24/11) : une tablette de scout avec onglets (identité, match,
entretien, synthèse), terrain tactique et cages propres, annotés au stylet. Sans la fiche du match
(jugée inutile par le propriétaire). Copie en ligne sur claude.ai : voir le lien dans le fil du projet.

## animation-match/

Animation (24/11) : on ne voit jamais le match, seulement la tablette du scout qui se remplit
pendant qu'il le regarde (minute qui avance, flèches et croix au stylet sur le terrain et les
cages, notes écrites à la main, bâtons des duels). Principe validé par le propriétaire : pas de
match simulé à l'écran, sinon on refait un jeu de gestion classique.
