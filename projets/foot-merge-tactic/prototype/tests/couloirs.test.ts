// Jeu dans les couloirs (14/11) : montée du latéral, repiquage de l'ailier,
// appel au second poteau. Référence football §6 (latéral : « monte haut
// (dépassements) » ; « sprint de repli : c'est le prix d'un latéral qui attaque
// haut » ; côtés : « largeur ou entrée dans le demi-espace »).

import { describe, expect, test } from "bun:test";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import type { JoueurSim } from "../src/sim/simulation";
import { MatchSim } from "../src/sim/simulation";

const donnees = chargerDonnees("hexagones");
const reglages = chargerReglages();
const { effectif, adversaire } = chargerEquipes(donnees);
const L = donnees.longueurM;
const W = donnees.largeurM;

type Interne = { montee: { joueur: JoueurSim } | null; repique: { joueur: JoueurSim; point: { x: number } } | null; porteur: JoueurSim | null };

describe("couloirs (14/11)", () => {
  test("le latéral monte des fois, seulement quand son équipe a le ballon, et revient à la perte", () => {
    let montees = 0;
    let pasEnMontee = 0;
    let latDernierTiers = 0;
    for (let g = 1; g <= 6; g++) {
      const m = new MatchSim(donnees, reglages, [effectif, adversaire], g, true);
      m.definirOptions({ tactiques: true, styles: false });
      m.demarrer();
      const b = m.balle! as unknown as Interne;
      for (let t = 0; t < 180; t += reglages.pasDeTempsS) {
        m.pas();
        const mo = b.montee;
        if (mo) {
          pasEnMontee++;
          expect(["DG", "DD"]).toContain(mo.joueur.poste.id);
          expect(mo.joueur.camp).toBe(m.possession); // pas de montée sans le ballon
        }
        for (const j of m.joueurs) if ((j.poste.id === "DG" || j.poste.id === "DD") && (j.camp === 0 ? j.pos.y : L - j.pos.y) > (2 * L) / 3) latDernierTiers++;
      }
      montees += m.balle!.stats.montees[0] + m.balle!.stats.montees[1];
    }
    // « Pas tout le temps, mais des fois » : quelques montées par mi-temps et par équipe, pas en permanence.
    expect(montees / 12).toBeGreaterThan(2);
    expect(montees / 12).toBeLessThan(15);
    expect(pasEnMontee / (6 * 180 * 30)).toBeLessThan(0.5);
    expect(latDernierTiers).toBeGreaterThan(0); // avant le 14/11 : jamais
  });

  test("l'ailier repique vers l'axe balle au pied, et l'ailier opposé attaque le second poteau", () => {
    let repiquages = 0;
    let versAxe = 0;
    let secondPoteau = 0;
    for (let g = 1; g <= 6; g++) {
      const m = new MatchSim(donnees, reglages, [effectif, adversaire], 100 + g, true);
      m.definirOptions({ tactiques: true, styles: false });
      m.demarrer();
      const b = m.balle! as unknown as Interne;
      let vu: unknown = null;
      for (let t = 0; t < 180; t += reglages.pasDeTempsS) {
        m.pas();
        const rq = b.repique;
        if (rq && rq !== vu) {
          vu = rq;
          // La course rentre vers l'axe.
          if (Math.abs(rq.point.x - W / 2) < Math.abs(rq.joueur.pos.x - W / 2)) versAxe++;
        }
        const p = b.porteur;
        if (p && (p.camp === 0 ? p.pos.y : L - p.pos.y) > 75 && Math.abs(p.pos.x - W / 2) > 14) {
          const oppose = m.joueurs.find((q) => q.camp === p.camp && (q.poste.id === "AG" || q.poste.id === "AD") && Math.sign(q.cible.x - W / 2) !== Math.sign(p.pos.x - W / 2));
          if (oppose && Math.abs(oppose.cible.x - W / 2) < 8) secondPoteau++;
        }
      }
      repiquages += m.balle!.stats.repiquages[0] + m.balle!.stats.repiquages[1];
    }
    expect(repiquages).toBeGreaterThan(0);
    expect(versAxe).toBe(repiquages);
    expect(secondPoteau).toBeGreaterThan(0);
  });

  test("14/11 : charnière centrale proche, avec et sans le ballon, loin des latéraux", () => {
    const somme = { attaque: { ecart: 0, lat: 0, n: 0 }, defense: { ecart: 0, lat: 0, n: 0 } };
    for (let g = 1; g <= 4; g++) {
      const m = new MatchSim(donnees, reglages, [effectif, adversaire], 200 + g, true);
      m.definirOptions({ tactiques: true, styles: false });
      m.demarrer();
      for (let t = 0; t < 120; t += reglages.pasDeTempsS) {
        m.pas();
        for (const camp of [0, 1] as const) {
          const dc = m.joueurs.filter((j) => j.camp === camp && j.poste.id === "DC").sort((a, b) => a.pos.x - b.pos.x);
          const lat = m.joueurs.filter((j) => j.camp === camp && (j.poste.id === "DG" || j.poste.id === "DD"));
          if (dc.length < 2 || !lat.length) continue;
          const p = dc[0]!.phase === "attaque" ? somme.attaque : somme.defense;
          p.ecart += dc[dc.length - 1]!.pos.x - dc[0]!.pos.x;
          p.lat += Math.min(...dc.map((d) => Math.min(...lat.map((l) => Math.abs(l.pos.x - d.pos.x)))));
          p.n++;
        }
      }
    }
    // Avant le 14/11 : 29 m entre les DC avec le ballon, 9 m du latéral le plus proche.
    expect(somme.attaque.ecart / somme.attaque.n).toBeLessThan(20);
    expect(somme.defense.ecart / somme.defense.n).toBeLessThan(14);
    expect(somme.attaque.lat / somme.attaque.n).toBeGreaterThan(12);
    expect(somme.defense.lat / somme.defense.n).toBeGreaterThan(12);
  });
});
