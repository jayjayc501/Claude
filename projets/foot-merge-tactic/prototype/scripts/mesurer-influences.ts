// Mesure l'effet des tactiques et des styles (PROPOSITION du 12/11) : notre
// équipe (camp 0, effectif de equipes.json) joue avec une tactique ou des
// styles contre l'adversaire en Équilibrée, sans style. Mêmes graines pour
// toutes les configurations. Lancer : bun run scripts/mesurer-influences.ts [graines] [secondes]

import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { MatchSim } from "../src/sim/simulation";
import type { Equipe } from "../src/sim/types";

const GRAINES = Number(process.argv[2] ?? 12);
const DUREE_S = Number(process.argv[3] ?? 180);

const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);
const L = donnees.longueurM;

/** Notre équipe avec une tactique et, pour un style donné, trois joueurs de champ qui l'ont (palier atteint). */
function nous(tactique: string, style?: string): Equipe {
  const titulaires = effectif.composition.map((p) => p.joueurId);
  const champ = effectif.composition.filter((p) => p.poste !== "G").map((p) => p.joueurId);
  // Trois joueurs répartis sur le terrain (défense, milieu, attaque) reçoivent le style.
  const choisis = style ? [champ[1], champ[5], champ[champ.length - 1]] : [];
  return {
    ...effectif,
    tactique,
    joueurs: effectif.joueurs.map((j) => ({ ...j, style: choisis.includes(j.id) && titulaires.includes(j.id) ? style : null })),
  };
}

interface Mesure {
  possession: number;
  passes: number;
  reussite: number;
  tirs: number;
  tirsContre: number;
  buts: number;
  butsContre: number;
  ligne: number;
  recupHautes: number;
  tacles: number;
  fautes: number;
  changements: number;
  recupTot: number;
  reussiteAdv: number;
  tirsRapides: number;
}

function jouer(equipe: Equipe, graine: number): Mesure {
  const sim = new MatchSim(donnees, reglages, [equipe, adversaire], graine, true);
  sim.demarrer();
  const dt = reglages.pasDeTempsS;
  let avant = sim.possession;
  let ligneSomme = 0;
  let ligneN = 0;
  let recupHautes = 0;
  let changements = 0;
  let recupTot = 0;
  let tirsRapides = 0;
  let derniereRecup = -Infinity;
  let tirsAvant = 0;
  for (let t = 0; t < DUREE_S; t += dt) {
    sim.pas();
    if (sim.possession !== avant) {
      changements++;
      if (sim.possession === 0) {
        recupTot++;
        derniereRecup = sim.temps;
        if (sim.ballon.y > L / 2) recupHautes++; // ballon repris dans le camp adverse
      }
      avant = sim.possession;
    }
    const tirs = sim.balle!.stats.tirs[0];
    if (tirs > tirsAvant && sim.temps - derniereRecup < 10) tirsRapides += tirs - tirsAvant; // tir moins de 10 s après la récupération
    tirsAvant = tirs;
    const h = sim.lignesDef[0];
    if (h !== null) {
      ligneSomme += h;
      ligneN++;
    }
  }
  const st = sim.balle!.stats;
  return {
    possession: sim.tempsPossession[0] / (sim.tempsPossession[0] + sim.tempsPossession[1]),
    passes: st.passes[0],
    reussite: st.passes[0] ? st.passesReussies[0] / st.passes[0] : 0,
    tirs: st.tirs[0],
    tirsContre: st.tirs[1],
    buts: sim.score[0],
    butsContre: sim.score[1],
    ligne: ligneN ? ligneSomme / ligneN : 0,
    recupHautes,
    tacles: st.tacles[0],
    fautes: st.fautes[0],
    changements: changements / (DUREE_S / 60),
    recupTot,
    reussiteAdv: st.passes[1] ? st.passesReussies[1] / st.passes[1] : 0,
    tirsRapides,
  };
}

const configs: [string, Equipe][] = [
  ["Équilibrée", nous("EQU")],
  ["Pressing", nous("PRS")],
  ["Gegenpressing", nous("GEG")],
  ["Contre", nous("CON")],
  ["Tiki-taka", nous("TIK")],
  ["3 Récupérateurs", nous("EQU", "REC")],
  ["3 Techniciens", nous("EQU", "TEC")],
  ["3 Rapides", nous("EQU", "RAP")],
  ["3 Remparts", nous("EQU", "REM")],
];

const f = (x: number, d = 1) => x.toFixed(d).padStart(6);
console.log(`${GRAINES} matchs de ${DUREE_S} s par configuration, contre l'adversaire en Équilibrée (moyennes par match, notre équipe)`);
console.log("Configuration      Poss.  Passes Réuss.  Tirs  T.rap. T.cont  Buts  B.cont  Ligne  Récup. dont H. Tacles Fautes R.adv. Ch.camp/min");
for (const [nom, equipe] of configs) {
  const ms = Array.from({ length: GRAINES }, (_, i) => jouer(equipe, i + 1));
  const moy = (k: keyof Mesure) => ms.reduce((s, m) => s + m[k], 0) / ms.length;
  console.log(
    `${nom.padEnd(17)} ${f(moy("possession") * 100, 0)}% ${f(moy("passes"))} ${f(moy("reussite") * 100, 0)}% ${f(moy("tirs"))} ${f(moy("tirsRapides"))} ${f(moy("tirsContre"))} ${f(moy("buts"), 2)} ${f(moy("butsContre"), 2)} ${f(moy("ligne"))} ${f(moy("recupTot"))} ${f(moy("recupHautes"))} ${f(moy("tacles"))} ${f(moy("fautes"))} ${f(moy("reussiteAdv") * 100, 0)}% ${f(moy("changements"))}`,
  );
}
