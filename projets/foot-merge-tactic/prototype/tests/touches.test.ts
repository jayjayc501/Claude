import { expect, test } from "bun:test";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { MatchSim } from "../src/sim/simulation";

const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);

// 13/11 (concepteur) : « sur les touches, ils donnent le ballon à l'adversaire collé ; il y a double touche ».
test("touches : lancer à un coéquipier libre, pas de double touche, ballon gardé le plus souvent", () => {
  let jouees = 0;
  let gardees = 0;
  let doubles = 0;
  for (let g = 1; g <= 16; g++) {
    const m = new MatchSim(donnees, reglages, [effectif, adversaire], g, true);
    m.demarrer();
    const b = m.balle!;
    let etat: { lanceur: (typeof m.joueurs)[number] | null; lance: number | null } | null = null;
    for (let i = 0; i < 180 * 30; i++) {
      const passes = b.stats.passes[0] + b.stats.passes[1];
      m.pas();
      if (b.evenement?.texte === "Touche" && m.temps - b.evenement.a < 0.05) etat = { lanceur: null, lance: null };
      if (!etat) continue;
      if (!etat.lanceur && b.porteur) etat.lanceur = b.porteur;
      if (etat.lanceur && etat.lance === null && b.stats.passes[0] + b.stats.passes[1] > passes) {
        etat.lance = m.temps;
        jouees++;
      }
      if (etat.lance !== null && b.porteur && m.temps - etat.lance > 0.05) {
        if (b.porteur === etat.lanceur) doubles++;
        else if (b.porteur.camp === etat.lanceur!.camp) gardees++;
        etat = null;
      } else if (etat.lance !== null && m.temps - etat.lance > 4) etat = null;
    }
  }
  expect(jouees).toBeGreaterThan(5);
  expect(doubles).toBe(0);
  expect(gardees / jouees).toBeGreaterThan(0.75);
});
