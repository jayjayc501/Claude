import { describe, expect, test } from "bun:test";
import { statsVides } from "../src/sim/ballon";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { BAREME, noteMatch } from "../src/sim/noteMatch";
import { MatchSim } from "../src/sim/simulation";

const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);

/** Une mi-temps jouée (180 s simulées), comme dans le prototype. */
function premiereMiTemps(graine = 3): MatchSim {
  const sim = new MatchSim(donnees, reglages, [effectif, adversaire], graine, true);
  sim.demarrer();
  sim.avancer(180);
  return sim;
}

describe("Mi-temps (13/11) : changements, places, fatigue, note de match", () => {
  test("un remplaçant entre frais ; un joueur qui reste garde sa fatigue", () => {
    const sim = premiereMiTemps();
    const titulaires = effectif.composition.map((p) => p.joueurId);
    const remplacant = effectif.joueurs.find((j) => !titulaires.includes(j.id) && j.postes[0] !== "G")!;
    const sortant = effectif.composition.find((p) => p.poste !== "G" && effectif.joueurs.find((j) => j.id === p.joueurId)!.postes.includes(remplacant.postes[0]!)) ?? effectif.composition.find((p) => p.poste !== "G")!;
    const composition = effectif.composition.map((p) => (p === sortant ? { ...p, joueurId: remplacant.id } : p));
    sim.commencerPeriode();
    sim.changerEquipe(0, { ...effectif, composition });
    const entrant = sim.joueurs.find((j) => j.joueur.id === remplacant.id)!;
    expect(entrant).toBeDefined();
    expect(sim.joueurs.some((j) => j.camp === 0 && j.joueur.id === sortant.joueurId)).toBe(false);
    expect(sim.joueurs.filter((j) => j.camp === 0).length).toBe(11);
    expect(entrant.entreeS).toBeCloseTo(sim.temps);
    // 20 minutes de la 2e mi-temps plus tard (65e) : les titulaires ont passé 60 minutes, pas l'entrant.
    sim.avancer(80);
    const titulaire = sim.joueurs.find((j) => j.camp === 0 && j !== entrant && j.poste.id !== "G")!;
    expect(entrant.fatigue).toBe(0);
    expect(titulaire.fatigue).toBeGreaterThan(0);
    expect(sim.forme(entrant)).toBe(100);
    expect(sim.forme(titulaire)).toBeLessThan(100);
  });

  test("déplacer un joueur à la mi-temps change sa place de coup d'envoi", () => {
    const sim = premiereMiTemps(5);
    const p = effectif.composition.find((x) => x.poste === "MC")!;
    const libre = donnees.poste("MC").cases.find((c) => !effectif.composition.some((x) => x.poste === "MC" && x.cellule === c.index))!;
    const composition = effectif.composition.map((x) => (x === p ? { ...x, cellule: libre.index } : x));
    sim.changerEquipe(0, { ...effectif, composition });
    const j = sim.joueurs.find((x) => x.joueur.id === p.joueurId)!;
    expect(j.cellule.index).toBe(libre.index);
    expect(j.depart).toEqual(sim.versAbsolu(0, j.cellule.centre));
  });

  test("note de match : 6 de base, un but et une passe décisive font monter, 3 à 10", () => {
    const st = statsVides();
    expect(noteMatch(st, "MC", 0, 0)).toBe(BAREME.base);
    expect(noteMatch({ ...st, buts: 2, passesDecisives: 1 }, "AC", 0, 1)).toBeGreaterThan(8);
    expect(noteMatch(st, "G", 4, -4)).toBeLessThan(5);
    expect(noteMatch({ ...st, buts: 9 }, "AC", 0, 9)).toBe(BAREME.max);
  });

  test("après un match, chaque joueur a une note ; les buteurs sont bien notés", () => {
    const sim = premiereMiTemps(7);
    const notes = sim.notesDuMatch();
    expect(notes.filter((n) => n.camp === 0).length).toBeGreaterThanOrEqual(11);
    for (const n of notes) {
      expect(n.note).toBeGreaterThanOrEqual(BAREME.min);
      expect(n.note).toBeLessThanOrEqual(BAREME.max);
    }
    const buteurs = [...(sim.balle?.statsJoueurs ?? [])].filter(([, s]) => s.buts > 0);
    for (const [k] of buteurs) expect(notes.find((n) => `${n.camp}:${n.id}` === k)!.note).toBeGreaterThan(6.5);
  });
});
