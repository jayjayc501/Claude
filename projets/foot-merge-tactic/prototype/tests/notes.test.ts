import { describe, expect, test } from "bun:test";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { NOTES, PARAMETRES_NOTES, decaler, notesAffichees, notesDe } from "../src/sim/notes";
import { MatchSim } from "../src/sim/simulation";
import type { Equipe, Notes } from "../src/sim/types";

const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);

const uniformes = (n: number): Partial<Notes> => ({ acceleration: n, pointe: n, passe: n, dribble: n, precision: n, puissance: n, duel: n, endurance: n });

/** Même équipe, avec un gardien noté (Réflexes, Placement, Sorties, Relance à n). */
function avecGardien(e: Equipe, n: number): Equipe {
  const gardien = e.composition.find((p) => p.poste === "G")?.joueurId;
  return { ...e, joueurs: e.joueurs.map((j) => ({ ...j, style: null, notes: j.id === gardien ? { reflexes: n, placement: n, sorties: n, relance: n } : null })) };
}

/** Équipe sans style ; notes données à tous les joueurs de champ (undefined : pas de notes). */
function avecNotes(e: Equipe, notes?: Partial<Notes>): Equipe {
  const gardien = e.composition.find((p) => p.poste === "G")?.joueurId;
  return { ...e, joueurs: e.joueurs.map((j) => ({ ...j, style: null, notes: j.id === gardien ? null : (notes ?? null) })) };
}

function jouer(nous: Equipe, eux: Equipe, graine: number, duree: number): MatchSim {
  const sim = new MatchSim(donnees, reglages, [nous, eux], graine, true);
  sim.demarrer();
  for (let t = 0; t < duree; t += reglages.pasDeTempsS) sim.pas();
  return sim;
}

describe("Notes des joueurs", () => {
  test("4 notes de 2 sous-notes ; une sous-note absente vaut la référence", () => {
    expect(NOTES.length).toBe(4);
    const n = notesDe({ id: "x", nom: "X", postes: ["MC"], notes: { passe: 80 } });
    expect(n.passe).toBe(80);
    expect(n.duel).toBe(PARAMETRES_NOTES.reference);
    expect(notesAffichees({ id: "x", nom: "X", postes: ["MC"], notes: { passe: 80, dribble: 71 } })!.find((a) => a.code === "TEC")!.valeur).toBe(76);
    expect(notesAffichees({ id: "g", nom: "G", postes: ["G"], notes: null })).toBeNull();
  });

  test("gardien (13/11) : 4 notes simples ; sa relance est sa passe, ses sorties sa portée", () => {
    const g = { id: "g", nom: "G", postes: ["G"], notes: { reflexes: 80, placement: 70, sorties: 60, relance: 75 } };
    expect(notesAffichees(g)!.map((a) => `${a.code} ${a.valeur}`)).toEqual(["RÉF 80", "PLA 70", "SOR 60", "REL 75"]);
    const n = notesDe(g);
    expect(n.passe).toBe(75);
    expect(n.duel).toBe(60);
    expect(notesDe({ id: "x", nom: "X", postes: ["MC"], notes: null }).reflexes).toBe(PARAMETRES_NOTES.reference);
  });

  test("gardien : un bon gardien encaisse moins qu'un mauvais (mêmes matchs)", () => {
    let bon = 0;
    let mauvais = 0;
    for (let g = 1; g <= 10; g++) {
      bon += jouer(adversaire, avecGardien(effectif, 88), g, 120).score[0];
      mauvais += jouer(adversaire, avecGardien(effectif, 42), g, 120).score[0];
    }
    expect(bon).toBeLessThan(mauvais);
  });

  test("écart nul : probabilité inchangée ; écart positif : plus de chances", () => {
    expect(decaler(0.37, 0)).toBe(0.37);
    expect(decaler(0.5, 10)).toBeGreaterThan(0.6);
    expect(decaler(0.5, 10)).toBeLessThan(0.7);
    expect(decaler(0.5, -20)).toBeLessThan(0.25);
  });

  test("65 partout : exactement le même match que sans notes (moteur inchangé)", () => {
    const a = jouer(avecNotes(effectif), avecNotes(adversaire), 7, 60);
    const b = jouer(avecNotes(effectif, uniformes(65)), avecNotes(adversaire, uniformes(65)), 7, 60);
    expect(b.score).toEqual(a.score);
    expect(b.balle!.stats).toEqual(a.balle!.stats);
    expect(b.joueurs.map((j) => j.pos)).toEqual(a.joueurs.map((j) => j.pos));
  });

  test("la note de vitesse change la vitesse de course", () => {
    const sim = new MatchSim(donnees, reglages, [avecNotes(effectif, { acceleration: 90, pointe: 90 }), avecNotes(adversaire, { acceleration: 40, pointe: 40 })], 3, true);
    const champ = sim.joueurs.filter((j) => j.poste.id !== "G");
    const rapide = champ.filter((j) => j.camp === 0).map((j) => j.vitesseF / j.facteur);
    const lent = champ.filter((j) => j.camp === 1).map((j) => j.vitesseF / j.facteur);
    expect(Math.min(...rapide)).toBeCloseTo(1 + 25 * PARAMETRES_NOTES.vitesse.pointeParPoint, 6);
    expect(Math.max(...lent)).toBeCloseTo(1 - 25 * PARAMETRES_NOTES.vitesse.pointeParPoint, 6);
  });

  test("une équipe nettement mieux notée tire plus et réussit plus de passes, sans tout gagner d'avance", () => {
    let tirs = [0, 0];
    let passes = [0, 0];
    let reussies = [0, 0];
    for (let g = 1; g <= 12; g++) {
      const sim = jouer(avecNotes(effectif, uniformes(80)), avecNotes(adversaire), g, 120);
      const s = sim.balle!.stats;
      tirs = [tirs[0]! + s.tirs[0], tirs[1]! + s.tirs[1]];
      passes = [passes[0]! + s.passes[0], passes[1]! + s.passes[1]];
      reussies = [reussies[0]! + s.passesReussies[0], reussies[1]! + s.passesReussies[1]];
    }
    expect(tirs[0]!).toBeGreaterThan(tirs[1]! * 1.5);
    expect(reussies[0]! / passes[0]!).toBeGreaterThan(reussies[1]! / passes[1]!);
    expect(tirs[1]!).toBeGreaterThan(0); // l'adversaire existe encore
  });

  test("fatigue : rien avant 30 minutes, puis on ralentit, d'autant plus que l'endurance est faible", () => {
    const sim = new MatchSim(donnees, reglages, [avecNotes(effectif, { endurance: 40 }), avecNotes(adversaire, { endurance: 90 })], 5, true);
    sim.demarrer();
    const k = 1 / PARAMETRES_NOTES.endurance.minutesParSeconde; // secondes simulées par minute de match
    sim.temps = 25 * k;
    sim.pas();
    expect(sim.joueurs.every((j) => j.fatigue === 0)).toBe(true);
    // 89e minute, en 2e mi-temps (commencée à la 45e).
    sim.temps = 45 * k;
    sim.commencerPeriode();
    sim.temps = 89 * k;
    sim.pas();
    const champ = sim.joueurs.filter((j) => j.poste.id !== "G");
    const faible = champ.filter((j) => j.camp === 0)[0]!;
    const forte = champ.filter((j) => j.camp === 1)[0]!;
    expect(faible.fatigue).toBeGreaterThan(0.15);
    expect(forte.fatigue).toBeGreaterThan(0);
    expect(forte.fatigue).toBeLessThan(0.05);
    expect(faible.vitesseF).toBeCloseTo(faible.vitesseRepos * (1 - faible.fatigue), 9);
  });
});
