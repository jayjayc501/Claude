// Réalisme du jeu (12/11 : « ça court tout le temps, trop de va-et-vient, les
// actions finissent trop vite en tir ») : changements de camp par minute et
// leurs causes, durée et passes par possession, part des possessions qui
// finissent en tir, tirs et buts, allures. Deux équipes en Équilibrée, styles
// coupés. Lancer : bun run scripts/mesurer-realisme.ts [graines] [secondes]

import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { MatchSim } from "../src/sim/simulation";

const GRAINES = Number(process.argv[2] ?? 20);
const DUREE_S = Number(process.argv[3] ?? 180);
const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);

const causes: Record<string, number> = {};
let changements = 0;
let possessions = 0;
let possAvecTir = 0;
let dureePoss = 0;
let passes = 0;
let reussies = 0;
let tirs = 0;
let buts = 0;
let arrets = 0;
let n = 0;
let vitesse = 0;
let marche = 0;
let sprint = 0;
for (let g = 1; g <= GRAINES; g++) {
  const m = new MatchSim(donnees, reglages, [effectif, adversaire], g, true);
  m.definirOptions({ tactiques: true, styles: false });
  m.demarrer();
  const b = m.balle!;
  let pos = m.possession;
  let debut = 0;
  let tirsDebut = 0;
  let snap = structuredClone(b.stats);
  let score = [...m.score];
  for (let t = 0; t < DUREE_S; t += reglages.pasDeTempsS) {
    m.pas();
    for (const j of m.joueurs) {
      if (j.poste.id === "G") continue;
      const v = Math.hypot(j.vit.x, j.vit.y);
      n++;
      vitesse += v;
      if (v < 2) marche++;
      if (v >= 7) sprint++;
    }
    if (m.possession !== pos) {
      const s = b.stats;
      const perd = pos;
      const gagne = m.possession;
      const c =
        m.score[perd]! > score[perd]! ? "but"
        : s.tirs[perd] > snap.tirs[perd] ? "tir"
        : s.fautes[gagne] > snap.fautes[gagne] || s.horsJeu[perd] > snap.horsJeu[perd] ? "faute ou hors-jeu"
        : s.sorties > snap.sorties ? "sortie"
        : s.tacles[gagne] > snap.tacles[gagne] ? "tacle"
        : s.degagements[perd] > snap.degagements[perd] ? "dégagement"
        : s.centres[perd] > snap.centres[perd] ? "centre"
        : s.passes[perd] > snap.passes[perd] ? "passe ratée"
        : "duel ou ballon libre";
      causes[c] = (causes[c] ?? 0) + 1;
      changements++;
      possessions++;
      dureePoss += m.temps - debut;
      if (s.tirs[perd] > tirsDebut) possAvecTir++;
      debut = m.temps;
      tirsDebut = s.tirs[gagne];
      pos = m.possession;
      snap = structuredClone(s);
      score = [...m.score];
    }
  }
  passes += b.stats.passes[0] + b.stats.passes[1];
  reussies += b.stats.passesReussies[0] + b.stats.passesReussies[1];
  tirs += b.stats.tirs[0] + b.stats.tirs[1];
  arrets += b.stats.arrets[0] + b.stats.arrets[1];
  buts += m.score[0] + m.score[1];
}
const minutes = (GRAINES * DUREE_S) / 60;
const pc = (x: number) => `${Math.round(x * 100)} %`;
console.log(`${GRAINES} matchs de ${DUREE_S} s, Équilibrée contre Équilibrée, styles coupés`);
console.log(`changements de camp : ${(changements / minutes).toFixed(1)} par minute (vrai football : 2 à 4)`);
console.log("  causes par minute : " + Object.entries(causes).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / minutes).toFixed(2)}`).join(" ; "));
console.log(`possession moyenne : ${(dureePoss / possessions).toFixed(1)} s, ${(passes / possessions).toFixed(1)} passes ; ${pc(possAvecTir / possessions)} des possessions finissent par un tir`);
console.log(`par match (deux équipes) : ${(tirs / GRAINES).toFixed(1)} tirs, ${(arrets / GRAINES).toFixed(1)} arrêts, ${(buts / GRAINES).toFixed(2)} buts ; passes ${(passes / GRAINES).toFixed(0)} (${pc(reussies / passes)} réussies)`);
console.log(`allures des joueurs de champ : ${(vitesse / n).toFixed(2)} m/s en moyenne, marche ${pc(marche / n)}, sprint ${pc(sprint / n)}`);
