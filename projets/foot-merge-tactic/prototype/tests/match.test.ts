import { describe, expect, test } from "bun:test";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { MatchSim } from "../src/sim/simulation";

describe("match en deux mi-temps", () => {
  test("coup d'envoi de la 2e mi-temps : ballon au centre, l'adversaire engage, chacun à sa place", () => {
    const donnees = chargerDonnees("hexagones");
    const reglages = chargerReglages();
    const { effectif, adversaire } = chargerEquipes(donnees);
    const sim = new MatchSim(donnees, reglages, [effectif, adversaire], 2, true);
    sim.demarrer();
    sim.avancer(60);
    sim.balle!.coupDEnvoi(1, "2e mi-temps");
    expect(sim.ballon).toEqual({ x: donnees.largeurM / 2, y: donnees.longueurM / 2 });
    expect(sim.balle!.evenement?.texte).toBe("2e mi-temps");
    sim.avancer(12);
    // Engagement joué par l'équipe 1, puis le jeu reprend normalement.
    expect(sim.balle!.stats.passes[1]).toBeGreaterThan(0);
    for (const j of sim.joueurs) expect(Number.isFinite(j.pos.x) && Number.isFinite(j.pos.y)).toBe(true);
  });
});
