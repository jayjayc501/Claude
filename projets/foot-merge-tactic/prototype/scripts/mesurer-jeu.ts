// Mesure le jeu de chaque tactique (styles coupés, 12/11) : notre équipe
// (camp 0) joue une tactique contre l'adversaire en Équilibrée. Statistiques
// de passes (nombre, réussite, longueur, part vers l'avant, part longue),
// possession, tirs, bloc, récupérations, et allures des joueurs de champ.
// Lancer : bun run scripts/mesurer-jeu.ts [graines] [secondes] [tactiques séparées par des virgules]

import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { MatchSim } from "../src/sim/simulation";
import type { Equipe } from "../src/sim/types";

const GRAINES = Number(process.argv[2] ?? 12);
const DUREE_S = Number(process.argv[3] ?? 180);
const TACTIQUES = (process.argv[4] ?? "EQU,PRS,GEG,CON,TIK").split(",");

const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);
const L = donnees.longueurM;

const sansStyle = (e: Equipe, tactique: string): Equipe => ({ ...e, tactique, joueurs: e.joueurs.map((j) => ({ ...j, style: null })) });

interface Mesure {
  poss: number;
  passes: number;
  reussite: number;
  longueur: number;
  avant: number;
  gain: number;
  longues: number;
  tirs: number;
  buts: number;
  butsContre: number;
  ligne: number;
  recupHautes: number;
  recupRapides: number;
  reussiteAdv: number;
  delaiTir: number;
  vitesse: number;
  marche: number;
  trot: number;
  course: number;
  sprint: number;
}

function jouer(tactique: string, graine: number): Mesure {
  const sim = new MatchSim(donnees, reglages, [sansStyle(effectif, tactique), sansStyle(adversaire, "EQU")], graine, true);
  sim.definirOptions({ tactiques: true, styles: false });
  sim.demarrer();
  const dt = reglages.pasDeTempsS;
  let avant = sim.possession;
  let ligne = 0;
  let nLigne = 0;
  let recupHautes = 0;
  let recupRapides = 0;
  let pertesEnJeu = 0;
  let dernierePerte = -Infinity;
  let derniereRecup = -Infinity;
  let tirsAvant = 0;
  const delais: number[] = [];
  let v = 0;
  const allures = [0, 0, 0, 0];
  let n = 0;
  for (let t = 0; t < DUREE_S; t += dt) {
    sim.pas();
    if (sim.possession !== avant) {
      if (sim.possession === 0) {
        derniereRecup = sim.temps;
        if (sim.ballon.y > L / 2) recupHautes++;
        if (sim.temps - dernierePerte < 5) recupRapides++; // contre-pressing réussi
      } else {
        // Perte en jeu (pas au gardien, pas sur un arrêt de jeu) : on peut contre-presser.
        const p = sim.balle!.porteur;
        if (p && p.poste.id !== "G" && !sim.balle!.arretDeJeu) {
          dernierePerte = sim.temps;
          pertesEnJeu++;
        } else dernierePerte = -Infinity;
      }
      avant = sim.possession;
    }
    const tirs = sim.balle!.stats.tirs[0];
    if (tirs > tirsAvant) delais.push(sim.temps - derniereRecup);
    tirsAvant = tirs;
    if (sim.lignesDef[0] !== null) {
      ligne += sim.lignesDef[0];
      nLigne++;
    }
    for (const j of sim.joueurs) {
      if (j.camp !== 0 || j.poste.id === "G") continue;
      const s = Math.hypot(j.vit.x, j.vit.y);
      v += s;
      n++;
      allures[s < 2 ? 0 : s < 5.5 ? 1 : s < 7 ? 2 : 3]!++;
    }
  }
  const st = sim.balle!.stats;
  const p = st.passes[0] || 1;
  return {
    poss: sim.tempsPossession[0] / (sim.tempsPossession[0] + sim.tempsPossession[1]),
    passes: st.passes[0],
    reussite: st.passesReussies[0] / p,
    longueur: st.distancePasses[0] / p,
    avant: st.passesAvant[0] / p,
    gain: st.gainPasses[0] / p,
    longues: st.passesLongues[0] / p,
    tirs: st.tirs[0],
    buts: sim.score[0],
    butsContre: sim.score[1],
    ligne: nLigne ? ligne / nLigne : 0,
    recupHautes,
    recupRapides: pertesEnJeu ? recupRapides / pertesEnJeu : 0,
    reussiteAdv: st.passes[1] ? st.passesReussies[1] / st.passes[1] : 0,
    delaiTir: delais.filter(Number.isFinite).length ? delais.filter(Number.isFinite).reduce((a, b) => a + b, 0) / delais.filter(Number.isFinite).length : 0,
    vitesse: v / n,
    marche: allures[0]! / n,
    trot: allures[1]! / n,
    course: allures[2]! / n,
    sprint: allures[3]! / n,
  };
}

const f = (x: number, d = 1) => x.toFixed(d).padStart(6);
const pc = (x: number) => `${(x * 100).toFixed(0)}%`.padStart(6);
console.log(`${GRAINES} matchs de ${DUREE_S} s par tactique, contre l'adversaire en Équilibrée, styles coupés (moyennes par match, notre équipe)`);
console.log("Tactique   Poss. Passes Réuss. Long.m Avant Gain.m Longues Tirs Buts B.ct Ligne Réc.H CP<5s R.adv Réc→tir | v m/s Marche  Trot Course Sprint");
for (const t of TACTIQUES) {
  const ms = Array.from({ length: GRAINES }, (_, i) => jouer(t, i + 1));
  const moy = (k: keyof Mesure) => ms.reduce((s, m) => s + m[k], 0) / ms.length;
  console.log(
    t.padEnd(9) +
      pc(moy("poss")) + f(moy("passes")) + pc(moy("reussite")) + f(moy("longueur")) + pc(moy("avant")) + f(moy("gain")) + pc(moy("longues")) +
      f(moy("tirs")) + f(moy("buts"), 2) + f(moy("butsContre"), 2) + f(moy("ligne")) + f(moy("recupHautes")) + pc(moy("recupRapides")) + pc(moy("reussiteAdv")) + f(moy("delaiTir")) +
      " |" + f(moy("vitesse"), 2) + pc(moy("marche")) + pc(moy("trot")) + pc(moy("course")) + pc(moy("sprint")),
  );
}
