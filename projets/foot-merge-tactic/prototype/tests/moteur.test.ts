import { describe, expect, test } from "bun:test";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { caseAuPoint, echanger, horsPoste, placer, retirer, verifier } from "../src/sim/placement";
import { projeter } from "../src/sim/projection";
import { MatchSim } from "../src/sim/simulation";
import type { Equipe } from "../src/sim/types";

const donnees = chargerDonnees();
const reglages = chargerReglages();
const L = donnees.longueurM;

function nouveauMatch(graine = 42, effectif?: Equipe): MatchSim {
  const { effectif: e, adversaire } = chargerEquipes();
  return new MatchSim(donnees, reglages, [effectif ?? e, adversaire], graine);
}

describe("données des postes", () => {
  test("nombre de cases validé par le concepteur", () => {
    const attendu: Record<string, number> = { G: 2, DC: 6, DG: 3, DD: 3, MC: 6, AG: 3, AD: 3, AC: 5 };
    for (const [id, n] of Object.entries(attendu)) expect(donnees.poste(id).cases.length).toBe(n);
  });

  test("tous les rectangles et toutes les cases sont dans son propre camp (coup d'envoi)", () => {
    for (const p of donnees.postes) {
      expect(p.rect.x).toBeGreaterThanOrEqual(0);
      expect(p.rect.x + p.rect.w).toBeLessThanOrEqual(1 + 1e-9);
      expect(p.rect.y).toBeGreaterThanOrEqual(0);
      expect(p.rect.y + p.rect.h).toBeLessThanOrEqual(0.5 + 1e-9);
      for (const c of p.cases) {
        expect(c.centre.x).toBeGreaterThan(p.rect.x);
        expect(c.centre.x).toBeLessThan(p.rect.x + p.rect.w);
        expect(c.centre.y).toBeGreaterThan(p.rect.y);
        expect(c.centre.y).toBeLessThan(p.rect.y + p.rect.h);
      }
    }
  });

  test("le milieu central couvre MDC, MC et MOC de bas en haut", () => {
    const roles = donnees.poste("MC").cases.map((c) => c.role);
    expect(roles).toEqual(["MDC", "MDC", "MC", "MC", "MOC", "MOC"]);
  });
});

describe("règles de placement", () => {
  const { effectif } = chargerEquipes();

  test("la composition par défaut est prête", () => {
    expect(verifier(effectif.composition, donnees)).toEqual([]);
  });

  test("on peut jouer à 3 défenseurs centraux, pas à 4", () => {
    let comp = retirer(effectif.composition, "oubrahim");
    const r3 = placer(comp, donnees, "lomont", "DC", 4);
    expect(r3.ok).toBe(true);
    if (!r3.ok) return;
    comp = retirer(r3.composition, "pellerin");
    const r4 = placer(comp, donnees, "pellerin", "DC", 5);
    expect(r4.ok).toBe(false);
  });

  test("une case déjà prise est refusée", () => {
    const r = placer(retirer(effectif.composition, "oubrahim"), donnees, "lomont", "DC", 0);
    expect(r.ok).toBe(false);
  });

  test("déplacer un joueur libère son ancienne case", () => {
    const r = placer(effectif.composition, donnees, "belcourt", "DC", 3);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.composition.filter((p) => p.joueurId === "belcourt")).toEqual([{ joueurId: "belcourt", poste: "DC", cellule: 3 }]);
    expect(r.composition.length).toBe(11);
  });

  test("pas de douzième joueur", () => {
    const r = placer(effectif.composition, donnees, "lomont", "DC", 4);
    expect(r.ok).toBe(false);
  });

  test("échange de deux joueurs : chacun prend la case de l'autre, la composition reste valide", () => {
    const r = echanger(effectif.composition, "belcourt", "oubrahim");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.composition.find((p) => p.joueurId === "belcourt")).toEqual({ joueurId: "belcourt", poste: "MC", cellule: 0 });
    expect(r.composition.find((p) => p.joueurId === "oubrahim")).toEqual({ joueurId: "oubrahim", poste: "DC", cellule: 0 });
    expect(verifier(r.composition, donnees)).toEqual([]);
  });

  test("échange refusé avec un remplaçant (il doit passer par une case)", () => {
    expect(echanger(effectif.composition, "belcourt", "lomont").ok).toBe(false);
  });

  test("case visée : le centre d'une case la désigne, et dans un chevauchement c'est la plus proche", () => {
    for (const p of donnees.postes) {
      for (const c of p.cases) {
        const vise = caseAuPoint(donnees, c.centre);
        expect(vise).toBeDefined();
        // Le centre d'une case vise cette case, sauf si une case d'un autre poste a exactement le même centre.
        expect(Math.hypot(vise!.centre.x - c.centre.x, vise!.centre.y - c.centre.y)).toBeCloseTo(0, 9);
      }
    }
    // Point hors de tout rectangle : rien.
    expect(caseAuPoint(donnees, { x: 0.5, y: 0.005 })).toBeDefined(); // zone du gardien
    expect(caseAuPoint(donnees, { x: 0.02, y: 0.02 })).toBeUndefined(); // coin, hors des rectangles
  });

  test("hors poste : un milieu défensif sur la ligne offensive", () => {
    const oubrahim = effectif.joueurs.find((j) => j.id === "oubrahim")!;
    expect(horsPoste(oubrahim, donnees, "MC", 0)).toBe(false);
    expect(horsPoste(oubrahim, donnees, "MC", 4)).toBe(true);
  });
});

describe("règles de projection", () => {
  const centre = { x: 0.5, y: 0.5 };
  test("chaque case est plus haute en attaque qu'en défense", () => {
    for (const p of donnees.postes) {
      for (const c of p.cases) {
        const att = projeter(c.centre, p, "attaque", centre, reglages, L);
        const def = projeter(c.centre, p, "defense", centre, reglages, L);
        expect(att.y).toBeGreaterThan(def.y);
      }
    }
  });

  test("prévisible : un DC placé haut reste plus haut qu'un DC placé bas, en attaque comme en défense", () => {
    const dc = donnees.poste("DC");
    for (const phase of ["attaque", "defense"] as const) {
      for (const ballon of [{ x: 0.2, y: 0.2 }, centre, { x: 0.8, y: 0.8 }]) {
        const bas = projeter(dc.cases[1]!.centre, dc, phase, ballon, reglages, L);
        const haut = projeter(dc.cases[4]!.centre, dc, phase, ballon, reglages, L);
        expect(haut.y).toBeGreaterThan(bas.y);
      }
    }
  });

  test("l'attaquant devant le but arrive près de la surface adverse en attaque", () => {
    const ac = donnees.poste("AC");
    const p = projeter(ac.cases[4]!.centre, ac, "attaque", centre, reglages, L);
    expect(p.y * L).toBeGreaterThan(84);
  });

  test("le bloc glisse du côté du ballon en défense", () => {
    const mc = donnees.poste("MC");
    const gauche = projeter(mc.cases[2]!.centre, mc, "defense", { x: 0.1, y: 0.4 }, reglages, L);
    const droite = projeter(mc.cases[2]!.centre, mc, "defense", { x: 0.9, y: 0.4 }, reglages, L);
    expect(droite.x).toBeGreaterThan(gauche.x);
  });
});

describe("simulation", () => {
  test("au coup d'envoi, chaque équipe est dans sa moitié", () => {
    const m = nouveauMatch();
    for (const j of m.joueurs) {
      if (j.camp === 0) expect(j.pos.y).toBeLessThanOrEqual(L / 2);
      else expect(j.pos.y).toBeGreaterThanOrEqual(L / 2);
    }
  });

  test("pas de téléportation et personne ne sort du terrain (90 s simulées)", () => {
    const m = nouveauMatch(7);
    m.demarrer();
    const pasMax = reglages.mouvement.vitesseMaxMS * reglages.pasDeTempsS;
    for (let i = 0; i < 90 / reglages.pasDeTempsS; i++) {
      m.pas();
      for (const j of m.joueurs) {
        expect(j.pos.x).toBeGreaterThanOrEqual(0);
        expect(j.pos.x).toBeLessThanOrEqual(donnees.largeurM);
        expect(j.pos.y).toBeGreaterThanOrEqual(0);
        expect(j.pos.y).toBeLessThanOrEqual(L);
      }
    }
    expect(m.maxDeplacementParPas).toBeLessThanOrEqual(pasMax + 1e-9);
  });

  test("même graine, même match ; autre graine, autre match", () => {
    const a = nouveauMatch(123);
    const b = nouveauMatch(123);
    const c = nouveauMatch(999);
    for (const m of [a, b, c]) {
      m.demarrer();
      m.avancer(40);
    }
    expect(a.joueurs.map((j) => j.pos)).toEqual(b.joueurs.map((j) => j.pos));
    expect(a.joueurs.map((j) => j.pos)).not.toEqual(c.joueurs.map((j) => j.pos));
  });

  test("la bascule attaque / défense attend le délai de transition", () => {
    const m = nouveauMatch();
    m.demarrer();
    m.definirMode("nous");
    m.avancer(3);
    expect(m.phases[0]).toBe("attaque");
    m.definirMode("eux");
    m.pas();
    expect(m.phases[0]).toBe("attaque");
    expect(m.enTransition).toBe(true);
    m.avancer(reglages.transition.delaiS + 0.1);
    expect(m.phases[0]).toBe("defense");
    expect(m.phases[1]).toBe("attaque");
  });

  test("le bloc monte quand on a le ballon et redescend quand on le perd", () => {
    const moyenneY = (m: MatchSim) =>
      m.joueurs.filter((j) => j.camp === 0).reduce((s, j) => s + j.pos.y, 0) / 11;
    const m = nouveauMatch();
    m.demarrer();
    m.definirMode("nous");
    m.avancer(15);
    const enAttaque = moyenneY(m);
    m.definirMode("eux");
    m.avancer(15);
    const enDefense = moyenneY(m);
    expect(enAttaque - enDefense).toBeGreaterThan(15);
  });

  test("les joueurs ne s'empilent pas", () => {
    const m = nouveauMatch(5);
    m.demarrer();
    let minimum = Infinity;
    for (let t = 0; t < 60; t += 1) {
      m.avancer(1);
      if (t < 5) continue;
      for (let i = 0; i < m.joueurs.length; i++) {
        for (let k = i + 1; k < m.joueurs.length; k++) {
          const a = m.joueurs[i]!.pos;
          const b = m.joueurs[k]!.pos;
          minimum = Math.min(minimum, Math.hypot(a.x - b.x, a.y - b.y));
        }
      }
    }
    expect(minimum).toBeGreaterThan(1);
  });

  test("avec 3 DC dont un placé haut, il est bien plus haut que les deux autres en match", () => {
    const { effectif } = chargerEquipes();
    const r = placer(retirer(effectif.composition, "oubrahim"), donnees, "lomont", "DC", 4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const m = nouveauMatch(3, { ...effectif, composition: r.composition });
    m.demarrer();
    m.definirMode("eux");
    m.avancer(10);
    const y = (id: string) => m.joueurs.find((j) => j.joueur.id === id)!.pos.y;
    expect(y("lomont")).toBeGreaterThan(y("belcourt") + 5);
    expect(y("lomont")).toBeGreaterThan(y("kessai") + 5);
  });
});
