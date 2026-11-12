import { describe, expect, test } from "bun:test";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { NEUTRE, chargerInfluences, corriger, paliersAtteints, reglagesEquipe } from "../src/sim/influences";
import { MatchSim } from "../src/sim/simulation";
import type { Equipe } from "../src/sim/types";

const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);
const inf = chargerInfluences();
const tous = { tactiques: true, styles: true };

/** Notre équipe avec une tactique et un style donné à certains titulaires. */
function nous(tactique: string, style?: string, combien = 3): Equipe {
  const champ = effectif.composition.filter((p) => p.poste !== "G").map((p) => p.joueurId).slice(0, combien);
  return { ...effectif, tactique, joueurs: effectif.joueurs.map((j) => ({ ...j, style: style && champ.includes(j.id) ? style : null })) };
}

/** Moyennes sur quelques matchs courts : hauteur de notre ligne défensive, passes, réussite. */
function mesurer(equipe: Equipe, graines = 4, duree = 90): { ligne: number; passes: number; reussite: number } {
  let ligne = 0;
  let n = 0;
  let passes = 0;
  let reussies = 0;
  for (let g = 1; g <= graines; g++) {
    const sim = new MatchSim(donnees, reglages, [equipe, adversaire], g, true);
    sim.demarrer();
    for (let t = 0; t < duree; t += reglages.pasDeTempsS) {
      sim.pas();
      if (sim.lignesDef[0] !== null) {
        ligne += sim.lignesDef[0];
        n++;
      }
    }
    passes += sim.balle!.stats.passes[0];
    reussies += sim.balle!.stats.passesReussies[0];
  }
  return { ligne: ligne / n, passes: passes / graines, reussite: reussies / passes };
}

describe("tactiques et styles (proposition du 12/11)", () => {
  test("correctifs : remplacer, multiplier, ajouter ; chemin inconnu refusé", () => {
    const r = structuredClone(reglages);
    corriger(r, { "ballon.pressingM": 17, "ballon.tacle.parSeconde": { fois: 2 }, "ballon.contrePressing.joueurs": { plus: 1 } });
    expect(r.ballon.pressingM).toBe(17);
    expect(r.ballon.tacle.parSeconde).toBeCloseTo(reglages.ballon.tacle.parSeconde * 2);
    expect(r.ballon.contrePressing.joueurs).toBe(reglages.ballon.contrePressing.joueurs + 1);
    expect(() => corriger(r, { "ballon.inconnu": 1 })).toThrow();
  });

  test("Équilibrée sans style : les réglages de base, sans copie (moteur inchangé)", () => {
    expect(reglagesEquipe(reglages, nous("EQU"), "EQU", inf, tous)).toBe(reglages);
    expect(reglagesEquipe(reglages, nous("PRS"), "PRS", inf, { tactiques: false, styles: true })).toBe(reglages);
    const sim = new MatchSim(donnees, reglages, [effectif, adversaire], 1, true);
    expect(sim.reg(0)).toBe(reglages);
    expect(sim.joueurs.every((j) => j.effet === NEUTRE)).toBe(true);
  });

  test("palier de style à 3 joueurs sur le terrain ; coupé avec les styles", () => {
    expect(paliersAtteints(nous("EQU", "REC", 3), effectif.composition, inf)).toEqual(["REC"]);
    expect(paliersAtteints(nous("EQU", "REC", 2), effectif.composition, inf)).toEqual([]);
    const sim = new MatchSim(donnees, reglages, [nous("EQU", "REC", 3), adversaire], 1, true);
    expect(sim.paliers(0)).toEqual(["REC"]);
    expect(sim.reg(0).ballon.contrePressing.joueurs).toBe(reglages.ballon.contrePressing.joueurs + 1);
    sim.definirOptions({ styles: false });
    expect(sim.paliers(0)).toEqual([]);
    expect(sim.reg(0)).toBe(reglages);
    expect(sim.joueurs.every((j) => j.effet === NEUTRE)).toBe(true);
  });

  test("tactique changée en plein match : effet immédiat, match rejouable", () => {
    const jouer = () => {
      const sim = new MatchSim(donnees, reglages, [nous("EQU"), adversaire], 3, true);
      sim.demarrer();
      sim.avancer(30);
      sim.definirTactique(0, "PRS");
      expect(sim.reg(0).ballon.pressingM).toBe(17);
      sim.avancer(30);
      return { score: [...sim.score], pos: sim.joueurs.map((j) => [j.pos.x, j.pos.y]) };
    };
    expect(jouer()).toEqual(jouer());
  });

  test("réalisme (référence §3, le bloc) : ligne plus haute en Pressing, plus basse en Contre", () => {
    // 8 matchs : sur 4, le hasard des engagements pèse trop (12/11).
    const eq = mesurer(nous("EQU"), 8).ligne;
    const prs = mesurer(nous("PRS"), 8).ligne;
    const con = mesurer(nous("CON"), 8).ligne;
    expect(prs).toBeGreaterThan(eq + 2);
    expect(con).toBeLessThan(eq - 2);
  });

  test("réalisme (passes courtes) : plus de passes et mieux réussies en Tiki-taka", () => {
    const eq = mesurer(nous("EQU"), 4, 180);
    const tik = mesurer(nous("TIK"), 4, 180);
    expect(tik.passes).toBeGreaterThan(eq.passes * 1.2);
    expect(tik.reussite).toBeGreaterThan(eq.reussite);
  });
});
