import { describe, expect, test } from "bun:test";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { caseAuPoint, echanger, horsPoste, placer, remplacer, retirer, verifier } from "../src/sim/placement";
import { hauteurLigneDefensiveM, ligneAdverseM, lignesAttaqueM, projeter } from "../src/sim/projection";
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
    const attendu: Record<string, number> = { G: 2, DC: 6, DG: 3, DD: 3, MC: 9, AG: 3, AD: 3, AC: 6 };
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
    expect(roles).toEqual(["MDC", "MDC", "MDC", "MC", "MC", "MC", "MOC", "MOC", "MOC"]);
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

  test("remplacement : le remplaçant prend la case, le titulaire va sur le banc", () => {
    const r = remplacer(effectif.composition, "lomont", "belcourt");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.composition.find((p) => p.joueurId === "lomont")).toEqual({ joueurId: "lomont", poste: "DC", cellule: 0 });
    expect(r.composition.some((p) => p.joueurId === "belcourt")).toBe(false);
    expect(verifier(r.composition, donnees)).toEqual([]);
    expect(remplacer(effectif.composition, "kessai", "belcourt").ok).toBe(false);
  });

  test("cases de l'axe à cheval sur la gauche et la droite (DC, milieu, attaque)", () => {
    for (const id of ["DC", "MC", "AC"]) {
      const cases = donnees.poste(id).cases;
      for (let ligne = 0; ligne < cases.length / 3; ligne++) {
        const [g, a, d] = [cases[ligne * 3]!, cases[ligne * 3 + 1]!, cases[ligne * 3 + 2]!];
        expect(a.rect.x).toBeLessThan(g.rect.x + g.rect.w);
        expect(a.rect.x + a.rect.w).toBeGreaterThan(d.rect.x);
      }
    }
  });

  test("les grandes zones défense, milieu et attaque se chevauchent à peine (2 m au plus)", () => {
    const hauteur = (id: string) => {
      const r = donnees.poste(id).rect;
      return [r.y * L, (r.y + r.h) * L] as const;
    };
    const [, hautDC] = hauteur("DC");
    const [basMC, hautMC] = hauteur("MC");
    const [basAC] = hauteur("AC");
    expect(hautDC - basMC).toBeLessThanOrEqual(2);
    expect(hautMC - basAC).toBeLessThanOrEqual(2);
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
    expect(horsPoste(oubrahim, donnees, "MC", 6)).toBe(true);
  });
});

describe("règles de projection", () => {
  const centre = { x: 0.5, y: 0.5 };
  test("pour une même position du ballon, l'équipe est plus haute en attaque qu'en défense", () => {
    // Pas case par case : un défenseur central peut être aussi haut en défense
    // (bloc médian) qu'en construction. Mais l'équipe, elle, monte.
    const { effectif } = chargerEquipes();
    for (const by of [0.3, 0.5, 0.7]) {
      const ballon = { x: 0.5, y: by };
      const moyenne = (phase: "attaque" | "defense") =>
        effectif.composition.reduce((s, pl) => {
          const c = donnees.cellule(pl.poste, pl.cellule);
          return s + projeter(c.centre, donnees.poste(pl.poste), phase, ballon, reglages, L).y;
        }, 0) / effectif.composition.length;
      expect(moyenne("attaque") - moyenne("defense")).toBeGreaterThan(5 / L);
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

  test("l'attaquant placé haut dans l'axe joue sur la ligne défensive adverse, et près de la surface quand le ballon y arrive", () => {
    // Plus loin, il serait hors-jeu (ancienne règle : 80 m même ballon au
    // centre, donc derrière la défense adverse).
    const ac = donnees.poste("AC");
    for (const by of [0.3, 0.5, 0.6, 0.7]) {
      const ballon = { x: 0.5, y: by };
      const p = projeter(ac.cases[4]!.centre, ac, "attaque", ballon, reglages, L);
      expect(Math.abs(p.y * L - ligneAdverseM(ballon, reglages, L))).toBeLessThanOrEqual(1.5);
    }
    expect(projeter(ac.cases[4]!.centre, ac, "attaque", { x: 0.5, y: 0.78 }, reglages, L).y * L).toBeGreaterThan(85);
  });

  test("avec le ballon, l'ordre de profondeur du placement est gardé (ce qui est placé haut joue haut)", () => {
    const { effectif } = chargerEquipes();
    const champ = effectif.composition.filter((p) => p.poste !== "G");
    for (const by of [0.2, 0.5, 0.8]) {
      const ballon = { x: 0.5, y: by };
      const pts = champ.map((pl) => {
        const c = donnees.cellule(pl.poste, pl.cellule);
        return { base: c.centre.y, y: projeter(c.centre, donnees.poste(pl.poste), "attaque", ballon, reglages, L).y };
      });
      for (const a of pts) for (const b of pts) if (a.base < b.base - 1e-9) expect(a.y).toBeLessThanOrEqual(b.y + 1e-9);
    }
  });

  test("les cases les plus basse et la plus haute du demi-terrain donnent la ligne arrière et la ligne avant", () => {
    // Si le découpage change, les réglages profondeurPlacement doivent suivre.
    const ys = donnees.postes.filter((p) => p.id !== "G").flatMap((p) => p.cases.map((c) => c.centre.y));
    const { basY, hautY } = reglages.projection.attaque.profondeurPlacement;
    expect(Math.abs(Math.min(...ys) - basY)).toBeLessThan(0.01);
    expect(Math.abs(Math.max(...ys) - hautY)).toBeLessThan(0.01);
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
    // Perdu haut, le ballon est encore loin de notre but : le bloc défend
    // haut (bloc médian) et ne redescend donc pas jusqu'à sa surface.
    expect(enAttaque - enDefense).toBeGreaterThan(8);
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

  test("avec 3 DC dont un placé haut : un peu plus haut en défense, nettement plus haut en attaque", () => {
    const { effectif } = chargerEquipes();
    const r = placer(retirer(effectif.composition, "oubrahim"), donnees, "lomont", "DC", 4);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const m = nouveauMatch(3, { ...effectif, composition: r.composition });
    // On regarde la position visée (règle de placement), pas la position après
    // les écarts d'évitement : l'attaquant adverse se tient sur notre ligne et
    // pousse le défenseur. Le marquage viendra avec le vrai ballon (mission 2).
    const y = (id: string) => m.joueurs.find((j) => j.joueur.id === id)!.cible.y;
    m.demarrer();
    m.definirMode("eux");
    m.avancer(12);
    const ecartDefense = y("lomont") - (y("belcourt") + y("kessai")) / 2;
    expect(ecartDefense).toBeGreaterThan(0.5);
    expect(ecartDefense).toBeLessThan(5);
    m.definirMode("nous");
    m.avancer(12);
    expect(y("lomont") - (y("belcourt") + y("kessai")) / 2).toBeGreaterThan(8);
  });
});

// Contrôles tirés de docs/reference-football.md (§9.4) : le moteur ne doit pas
// s'éloigner du football. Mesurés en défense organisée, après le repli.
describe("réalisme (référence football)", () => {
  const LIGNE: Record<string, "defense" | "milieu" | "attaque" | "gardien"> = {};
  for (const p of donnees.postes) LIGNE[p.id] = p.ligneDefense;

  function defenseOrganisee(graine: number, effectif?: Equipe): MatchSim {
    const m = nouveauMatch(graine, effectif);
    m.demarrer();
    m.definirMode("eux");
    m.avancer(14);
    return m;
  }
  const notreLigne = (m: MatchSim, ligne: string) =>
    m.joueurs.filter((j) => j.camp === 0 && LIGNE[j.poste.id] === ligne);
  const moyenneY = (js: { pos: { y: number } }[]) => js.reduce((s, j) => s + j.pos.y, 0) / js.length;

  test("distance entre la ligne de défense et la ligne du milieu : 8 à 15 m", () => {
    for (const graine of [1, 2, 3, 4, 5]) {
      const m = defenseOrganisee(graine);
      const d = moyenneY(notreLigne(m, "milieu")) - moyenneY(notreLigne(m, "defense"));
      expect(d).toBeGreaterThanOrEqual(8);
      expect(d).toBeLessThanOrEqual(15);
    }
  });

  test("largeur en défense : lignes de 35 à 45 m (largeur de la surface), équipe de 38 à 50 m", () => {
    // Le minimum compte autant que le maximum : une équipe resserrée dans
    // l'axe laisse les côtés vides (retour du concepteur, 11/11).
    const largeur = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
    for (const graine of [1, 2, 3, 4, 5]) {
      const m = defenseOrganisee(graine);
      const def = largeur(notreLigne(m, "defense").map((j) => j.pos.x));
      const mil = largeur(notreLigne(m, "milieu").map((j) => j.pos.x));
      const equipe = largeur(m.joueurs.filter((j) => j.camp === 0 && j.poste.id !== "G").map((j) => j.pos.x));
      expect(def).toBeGreaterThanOrEqual(35);
      expect(def).toBeLessThanOrEqual(45);
      expect(mil).toBeGreaterThanOrEqual(35);
      expect(mil).toBeLessThanOrEqual(45);
      expect(equipe).toBeGreaterThanOrEqual(38);
      expect(equipe).toBeLessThanOrEqual(50);
    }
  });

  test("longueur de l'équipe en défense (dernier défenseur → joueur le plus avancé) : 40 m au plus", () => {
    for (const graine of [1, 2, 3, 4, 5]) {
      const m = defenseOrganisee(graine);
      const champ = m.joueurs.filter((j) => j.camp === 0 && j.poste.id !== "G").map((j) => j.pos.y);
      expect(Math.max(...champ) - Math.min(...champ)).toBeLessThanOrEqual(40);
    }
  });

  test("un latéral placé haut revient dans la ligne des défenseurs centraux quand on défend", () => {
    const { effectif } = chargerEquipes();
    const r = placer(effectif.composition, donnees, "ferrand", "DG", 2);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    for (const graine of [1, 2, 3]) {
      const m = defenseOrganisee(graine, { ...effectif, composition: r.composition });
      const dg = m.joueurs.find((j) => j.joueur.id === "ferrand")!;
      const dcs = m.joueurs.filter((j) => j.camp === 0 && j.poste.id === "DC");
      expect(Math.abs(dg.pos.y - moyenneY(dcs))).toBeLessThan(5);
    }
  });

  test("le latéral placé haut monte beaucoup plus haut que les défenseurs centraux quand on attaque", () => {
    const { effectif } = chargerEquipes();
    const r = placer(effectif.composition, donnees, "ferrand", "DG", 2);
    if (!r.ok) throw new Error(r.erreur);
    const m = nouveauMatch(1, { ...effectif, composition: r.composition });
    m.demarrer();
    m.definirMode("nous");
    m.avancer(14);
    const dg = m.joueurs.find((j) => j.joueur.id === "ferrand")!;
    const dcs = m.joueurs.filter((j) => j.camp === 0 && j.poste.id === "DC");
    expect(dg.pos.y - moyenneY(dcs)).toBeGreaterThan(15);
  });

  test("le bloc coulisse : ballon à gauche, centre du bloc à gauche ; ballon à droite, à droite", () => {
    const { effectif } = chargerEquipes();
    const centreDuBloc = (ballonX: number) => {
      const xs = effectif.composition
        .filter((p) => p.poste !== "G")
        .map((p) => {
          const poste = donnees.poste(p.poste);
          const c = donnees.cellule(p.poste, p.cellule);
          return projeter(c.centre, poste, "defense", { x: ballonX, y: 0.4 }, reglages, L).x;
        });
      return xs.reduce((s, x) => s + x, 0) / xs.length;
    };
    expect(centreDuBloc(0.1)).toBeLessThan(0.45);
    expect(centreDuBloc(0.9)).toBeGreaterThan(0.55);
  });

  test("ligne défensive : plus basse quand le ballon approche du but, jamais sous le minimum du bloc", () => {
    const l = reglages.projection.defense.ligneDefensive;
    expect(hauteurLigneDefensiveM({ x: 0.5, y: 0.2 }, reglages, L)).toBe(l.hauteurMinM);
    expect(hauteurLigneDefensiveM({ x: 0.5, y: 0.5 }, reglages, L)).toBeGreaterThan(l.hauteurMinM);
    expect(hauteurLigneDefensiveM({ x: 0.5, y: 0.9 }, reglages, L)).toBe(l.hauteurMaxM);
  });
  // ---- Avec le ballon (ajoutés le 11/11 après le retour du concepteur :
  // ligne adverse enfoncée dans sa surface, équipe étirée sur 60 m). Mesurés
  // sur de longues possessions, plusieurs graines : un contrôle à un instant
  // donné ne voit pas une dérive.

  test("forme en possession (fonction du ballon) : défense 15 à 30 m derrière le ballon au milieu, équipe de 30 à 50 m", () => {
    const a = reglages.projection.attaque;
    for (let by = 0.05; by <= 0.95; by += 0.05) {
      const { arriereM, avantM } = lignesAttaqueM({ x: 0.5, y: by }, reglages, L);
      expect(avantM - arriereM).toBeGreaterThanOrEqual(a.longueurEquipeM.min - 1e-9);
      expect(avantM - arriereM).toBeLessThanOrEqual(a.longueurEquipeM.max + 1e-9);
      if (by * L >= 35 && by * L <= 70) {
        expect(by * L - arriereM).toBeGreaterThanOrEqual(15);
        expect(by * L - arriereM).toBeLessThanOrEqual(30);
      }
    }
  });

  function possession(graine: number, mode: "nous" | "auto", secondes: number, mesurer: (m: MatchSim, camp: 0 | 1) => void) {
    const m = nouveauMatch(graine);
    m.demarrer();
    m.definirMode(mode);
    for (let t = 0; t < secondes; t += 0.25) {
      m.avancer(0.25);
      if (t < 8) continue;
      for (const camp of [0, 1] as const) if (m.phases[camp] === "attaque" && !m.enTransition) mesurer(m, camp);
    }
  }
  const yRepere = (m: MatchSim, camp: 0 | 1, p: { x: number; y: number }) => m.versRepere(camp, p).y * L;

  test("en attaque, personne ne s'installe derrière la défense adverse (hors-jeu)", () => {
    for (const graine of [1, 2, 3, 4]) {
      let n = 0;
      let auDela = 0;
      let pire = 0;
      possession(graine, "nous", 60, (m, camp) => {
        const dernier = Math.max(...m.joueurs.filter((j) => j.camp !== camp && j.poste.id !== "G").map((j) => yRepere(m, camp, j.pos)));
        const ballon = yRepere(m, camp, m.ballon);
        const devant = Math.max(...m.joueurs.filter((j) => j.camp === camp).map((j) => yRepere(m, camp, j.pos)));
        const d = devant - Math.max(dernier, ballon);
        n++;
        if (d > 3) auDela++;
        pire = Math.max(pire, d);
      });
      expect(auDela / n).toBeLessThan(0.05);
      expect(pire).toBeLessThan(8);
    }
  });

  test("la défense adverse n'est pas repoussée : elle tient la hauteur que lui donne le ballon", () => {
    for (const graine of [1, 2, 3, 4]) {
      let n = 0;
      let enfoncee = 0;
      possession(graine, "nous", 60, (m, camp) => {
        const adv = (1 - camp) as 0 | 1;
        const ecarts = m.joueurs
          .filter((j) => j.camp === adv && j.poste.ligneDefense === "defense")
          .map((j) => yRepere(m, adv, j.cible) - yRepere(m, adv, j.pos));
        n++;
        if (Math.max(...ecarts) > 5) enfoncee++; // un défenseur 5 m plus bas que sa place
      });
      // Un peu de retard quand le ballon repart vite en arrière, jamais durablement.
      expect(enfoncee / n).toBeLessThan(0.12);
    }
  });

  test("longueur et largeur en possession : 30 à 50 m de long (55 au plus), au moins 45 m de large", () => {
    for (const graine of [1, 2, 3, 4]) {
      const longueurs: number[] = [];
      const largeurs: number[] = [];
      possession(graine, "nous", 60, (m, camp) => {
        const champ = m.joueurs.filter((j) => j.camp === camp && j.poste.id !== "G");
        const ys = champ.map((j) => yRepere(m, camp, j.pos));
        const xs = champ.map((j) => j.pos.x);
        longueurs.push(Math.max(...ys) - Math.min(...ys));
        largeurs.push(Math.max(...xs) - Math.min(...xs));
      });
      const mediane = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]!;
      expect(mediane(longueurs)).toBeGreaterThanOrEqual(30);
      expect(mediane(longueurs)).toBeLessThanOrEqual(50);
      expect(Math.max(...longueurs)).toBeLessThanOrEqual(55);
      expect(mediane(largeurs)).toBeGreaterThanOrEqual(45);
    }
  });

  test("défense de couverture : au moins 4 joueurs de champ derrière le ballon dans le camp adverse", () => {
    for (const graine of [1, 2, 3, 4]) {
      let n = 0;
      let ok = 0;
      possession(graine, "nous", 60, (m, camp) => {
        const ballon = yRepere(m, camp, m.ballon);
        if (ballon < L / 2) return;
        const derriere = m.joueurs.filter((j) => j.camp === camp && j.poste.id !== "G" && yRepere(m, camp, j.pos) < ballon).length;
        n++;
        if (derriere >= 4) ok++;
      });
      expect(n).toBeGreaterThan(0);
      expect(ok / n).toBeGreaterThan(0.95);
    }
  });
});
