import { describe, expect, test } from "bun:test";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { caseAuPoint, convertirComposition, dansLaCase, echanger, horsPoste, placer, remplacer, retirer, verifier } from "../src/sim/placement";
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

const PLATEAUX = ["hexagones", "carres"] as const;

describe.each(PLATEAUX)("plateau %s : données", (id) => {
  const donnees = chargerDonnees(id);

  test("nombre de cases (carrés : découpage validé ; hexagones : rangées décalées)", () => {
    const attendu: Record<string, Record<string, number>> = {
      carres: { G: 2, DC: 6, DG: 3, DD: 3, MC: 9, AG: 3, AD: 3, AC: 6 },
      hexagones: { G: 2, DC: 5, DG: 3, DD: 3, MC: 8, AG: 3, AD: 3, AC: 5 },
    };
    for (const [poste, n] of Object.entries(attendu[id]!)) expect(donnees.poste(poste).cases.length).toBe(n);
  });

  test("toutes les cases sont dans son propre camp (coup d'envoi)", () => {
    for (const p of donnees.postes) {
      expect(p.rect.x).toBeGreaterThanOrEqual(-1e-9);
      expect(p.rect.x + p.rect.w).toBeLessThanOrEqual(1 + 1e-9);
      expect(p.rect.y).toBeGreaterThanOrEqual(-1e-9);
      expect(p.rect.y + p.rect.h).toBeLessThanOrEqual(0.5 + 1e-9);
    }
  });

  test("les cases ne se chevauchent pas : un point du plateau désigne une seule case", () => {
    let points = 0;
    for (let i = 0; i < 97; i++) {
      for (let k = 0; k < 89; k++) {
        const pt = { x: (i + 0.37) / 97, y: ((k + 0.61) / 89) * 0.5 };
        const n = donnees.postes.reduce((s, p) => s + p.cases.filter((c) => dansLaCase(c, pt)).length, 0);
        expect(n).toBeLessThanOrEqual(1);
        if (n === 1) points++;
      }
    }
    expect(points).toBeGreaterThan(97 * 89 * 0.7); // le plateau couvre l'essentiel du demi-terrain
  });

  test("le milieu central va du milieu défensif (bas) au milieu offensif (haut)", () => {
    const rang: Record<string, number> = { MDC: 0, MC: 1, MOC: 2 };
    const cases = [...donnees.poste("MC").cases].sort((a, b) => a.centre.y - b.centre.y);
    for (let i = 1; i < cases.length; i++) expect(rang[cases[i]!.role]!).toBeGreaterThanOrEqual(rang[cases[i - 1]!.role]!);
    expect(cases[0]!.role).toBe("MDC");
    expect(cases[cases.length - 1]!.role).toBe("MOC");
  });

  test("case visée : le centre d'une case la désigne ; hors du plateau, aucune", () => {
    for (const p of donnees.postes) {
      for (const c of p.cases) {
        const vise = caseAuPoint(donnees, c.centre);
        expect(vise?.poste).toBe(p.id);
        expect(vise?.index).toBe(c.index);
      }
    }
    expect(caseAuPoint(donnees, { x: 0.5, y: 0.01 })?.poste).toBe("G"); // zone du gardien
    expect(caseAuPoint(donnees, { x: 0.05, y: 0.02 })).toBeUndefined(); // coin du but, hors plateau
    expect(caseAuPoint(donnees, { x: 0.1, y: 0.49 })).toBeUndefined(); // coin haut, sans case
  });

  test("les compositions par défaut sont valables sur ce plateau", () => {
    const { effectif, adversaire } = chargerEquipes(donnees);
    expect(verifier(effectif.composition, donnees)).toEqual([]);
    expect(verifier(adversaire.composition, donnees)).toEqual([]);
  });
});

describe("plateaux : passage de l'un à l'autre", () => {
  const hex = chargerDonnees("hexagones");
  const car = chargerDonnees("carres");

  test("en hexagones, les cases d'une rangée décalée sont à cheval sur deux cases de la rangée du dessous", () => {
    for (const id of ["DC", "MC", "AC"]) {
      const cases = hex.poste(id).cases;
      const ys = [...new Set(cases.map((c) => c.centre.y))].sort((a, b) => a - b);
      for (let r = 1; r < ys.length; r++) {
        const toutes = hex.postes.flatMap((p) => p.cases);
        const dessous = toutes.filter((c) => Math.abs(c.centre.y - ys[r - 1]!) < 1e-9);
        for (const c of cases.filter((x) => Math.abs(x.centre.y - ys[r]!) < 1e-9)) {
          const voisines = dessous.filter((d) => Math.abs(Math.abs(d.centre.x - c.centre.x) - hex.pas.x / 2) < 1e-9);
          expect(voisines.length).toBe(2);
        }
      }
    }
  });

  test("chaque joueur garde son poste et sa place (aller-retour sans perte)", () => {
    const { effectif, adversaire } = chargerEquipes(hex);
    for (const e of [effectif, adversaire]) {
      const versCarres = convertirComposition(e.composition, hex, car);
      expect(verifier(versCarres, car)).toEqual([]);
      versCarres.forEach((p, i) => expect(p.poste).toBe(e.composition[i]!.poste));
      expect(convertirComposition(versCarres, car, hex)).toEqual(e.composition);
    }
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
    const r4 = placer(comp, donnees, "pellerin", "DC", 3);
    expect(r4.ok).toBe(false);
    if (!r4.ok) expect(r4.erreur).toContain("maximum");
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

  test("échange refusé avec un remplaçant (il doit passer par une case)", () => {
    expect(echanger(effectif.composition, "belcourt", "lomont").ok).toBe(false);
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

  test("avec le ballon, l'ordre de profondeur du placement est gardé (ce qui est placé haut joue haut), hors surnombre", () => {
    const { effectif } = chargerEquipes();
    const champ = effectif.composition.filter((p) => p.poste !== "G");
    // Le surnombre côté ballon (12/11) fait monter latéral et milieux : on vérifie la règle de base sans lui.
    const sansSurnombre = structuredClone(reglages);
    sansSurnombre.projection.attaque.surnombre.distanceM = 0;
    for (const by of [0.2, 0.5, 0.8]) {
      const ballon = { x: 0.5, y: by };
      const pts = champ.map((pl) => {
        const c = donnees.cellule(pl.poste, pl.cellule);
        return { base: c.centre.y, y: projeter(c.centre, donnees.poste(pl.poste), "attaque", ballon, sansSurnombre, L).y };
      });
      for (const a of pts) for (const b of pts) if (a.base < b.base - 1e-9) expect(a.y).toBeLessThanOrEqual(b.y + 1e-9);
    }
  });

  test("surnombre côté ballon (12/11) : le latéral du côté du ballon monte, l'opposé et les centraux restent", () => {
    const poste = (id: string) => donnees.poste(id);
    const cas = (id: string, i: number, ballon: { x: number; y: number }) => projeter(donnees.cellule(id, i).centre, poste(id), "attaque", ballon, reglages, L);
    const ballonDroite = { x: 0.85, y: 0.85 };
    const ballonGauche = { x: 0.15, y: 0.85 };
    // DD monte quand le ballon est à droite, pas quand il est à gauche ; et inversement pour DG.
    expect((cas("DD", 1, ballonDroite).y - cas("DD", 1, ballonGauche).y) * L).toBeGreaterThan(3);
    expect((cas("DG", 1, ballonGauche).y - cas("DG", 1, ballonDroite).y) * L).toBeGreaterThan(3);
    // Les défenseurs centraux ne bougent pas en profondeur selon le côté du ballon.
    expect(cas("DC", 0, ballonDroite).y).toBeCloseTo(cas("DC", 0, ballonGauche).y, 6);
    // Ballon dans notre camp : pas de surnombre.
    expect(cas("DD", 1, { x: 0.85, y: 0.3 }).y).toBeCloseTo(cas("DD", 1, { x: 0.15, y: 0.3 }).y, 6);
  });

  test("la case la plus basse donne la ligne arrière, la plus haute la ligne avant", () => {
    const ballon = { x: 0.5, y: 0.6 };
    const { arriereM, avantM } = lignesAttaqueM(ballon, reglages, L);
    const toutes = donnees.postes.filter((p) => p.id !== "G").flatMap((p) => p.cases.map((c) => ({ p, c })));
    const bas = toutes.reduce((m, x) => (x.c.centre.y < m.c.centre.y ? x : m));
    const haut = toutes.reduce((m, x) => (x.c.centre.y > m.c.centre.y ? x : m));
    expect(projeter(bas.c.centre, bas.p, "attaque", ballon, reglages, L).y * L).toBeCloseTo(arriereM, 6);
    expect(projeter(haut.c.centre, haut.p, "attaque", ballon, reglages, L).y * L).toBeCloseTo(avantM, 6);
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
    // Personne ne dépasse sa vitesse de sprint (transition), écart individuel compris.
    const pasMax = reglages.transition.sprint.vitesseMS * (1 + reglages.mouvement.variationIndividuelle) * reglages.pasDeTempsS;
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

  test("changement de possession : chacun réagit à son tour, les plus proches du ballon d'abord", () => {
    // Retour du concepteur (12/11) : mouvements « robots », tous synchronisés.
    const r = reglages.transition.reaction;
    for (const graine of [1, 2, 3, 4]) {
      const m = nouveauMatch(graine);
      m.demarrer();
      m.definirMode("nous");
      m.avancer(10);
      m.definirMode("eux");
      m.pas();
      expect(m.enTransition).toBe(true);
      expect(m.phases[0]).toBe("attaque"); // personne n'a encore réagi
      const reactions = m.joueurs.map((j) => ({
        t: j.reagitA! - m.temps,
        d: Math.hypot(j.pos.x - m.ballon.x, j.pos.y - m.ballon.y),
      }));
      const ts = reactions.map((x) => x.t);
      expect(Math.min(...ts)).toBeGreaterThanOrEqual(r.minS - 1e-9);
      expect(Math.max(...ts) - Math.min(...ts)).toBeGreaterThan(0.3);
      const tri = [...reactions].sort((a, b) => a.d - b.d);
      const moyenne = (v: { t: number }[]) => v.reduce((s, x) => s + x.t, 0) / v.length;
      expect(moyenne(tri.slice(0, 5))).toBeLessThan(moyenne(tri.slice(-5)));
      m.avancer(1.6);
      expect(m.enTransition).toBe(false);
      expect(m.phases[0]).toBe("defense");
      expect(m.phases[1]).toBe("attaque");
    }
  });

  test("les cibles ne changent pas toutes au même instant (bascule et ballon qui part)", () => {
    const etalementsBascule: number[] = [];
    const etalementsBallon: number[] = [];
    // Sans la respiration (12/11), qui fait bouger les cibles en continu : on mesure ici le retard de perception.
    const sansRespiration = structuredClone(reglages);
    sansRespiration.mouvement.respiration.amplitudeM = 0;
    for (const graine of [1, 2, 3, 4, 5, 6]) {
      const m = new MatchSim(donnees, sansRespiration, [chargerEquipes().effectif, chargerEquipes().adversaire], graine);
      m.demarrer();
      m.definirMode("auto");
      const dt = reglages.pasDeTempsS;
      let precedentes = m.joueurs.map((j) => ({ ...j.cible }));
      let possession = m.possession;
      let debut = -1;
      let premier = new Map<number, number>();
      let immobileDepuis = 0;
      let dernierBallon = { ...m.ballon };
      let departBallon = -1;
      let premierBallon = new Map<number, number>();
      let ciblesImmobiles = false;
      for (let k = 0; k < 90 / dt; k++) {
        m.pas();
        if (m.possession !== possession) {
          possession = m.possession;
          debut = m.temps;
          premier = new Map();
        }
        // Bascule : premier instant où la cible de chacun saute (forme attaque ↔ défense).
        m.joueurs.forEach((j, i) => {
          const saut = Math.hypot(j.cible.x - precedentes[i]!.x, j.cible.y - precedentes[i]!.y);
          if (debut > 0 && !premier.has(i) && saut > 1) premier.set(i, m.temps - debut);
        });
        if (debut > 0 && m.temps - debut > 2) {
          if (premier.size >= 18) etalementsBascule.push(Math.max(...premier.values()) - Math.min(...premier.values()));
          debut = -1;
        }
        // Ballon qui part alors que tout le monde était en place (ballon et
        // cibles immobiles), hors transition : qui bouge quand ?
        const bouge = Math.hypot(m.ballon.x - dernierBallon.x, m.ballon.y - dernierBallon.y) > 1e-6;
        dernierBallon = { ...m.ballon };
        if (!bouge) immobileDepuis += dt;
        else {
          if (immobileDepuis >= 0.6 && ciblesImmobiles && !m.enTransition && departBallon < 0) {
            departBallon = m.temps;
            premierBallon = new Map();
          }
          immobileDepuis = 0;
        }
        if (departBallon > 0) {
          m.joueurs.forEach((j, i) => {
            const d = Math.hypot(j.cible.x - precedentes[i]!.x, j.cible.y - precedentes[i]!.y);
            if (!premierBallon.has(i) && d > 0.05) premierBallon.set(i, m.temps - departBallon);
          });
          if (m.temps - departBallon > 0.9 || m.enTransition) {
            if (premierBallon.size >= 18) etalementsBallon.push(Math.max(...premierBallon.values()) - Math.min(...premierBallon.values()));
            departBallon = -1;
          }
        }
        ciblesImmobiles = m.joueurs.every((j, i) => Math.hypot(j.cible.x - precedentes[i]!.x, j.cible.y - precedentes[i]!.y) < 0.01);
        precedentes = m.joueurs.map((j) => ({ ...j.cible }));
      }
    }
    expect(etalementsBascule.length).toBeGreaterThan(20);
    expect(etalementsBallon.length).toBeGreaterThan(5);
    // Avant le 12/11 : 0 s (toutes les cibles sautaient au même pas).
    for (const e of etalementsBascule) expect(e).toBeGreaterThan(0.25);
    for (const e of etalementsBallon) expect(e).toBeGreaterThan(0.15);
  });

  test("le bloc monte quand on a le ballon et redescend quand on le perd", () => {
    const moyenneY = (m: MatchSim) =>
      m.joueurs.filter((j) => j.camp === 0).reduce((s, j) => s + j.pos.y, 0) / 11;
    // Moyenne sur 6 graines : le faux ballon (possession simulée) suit un
    // trajet aléatoire qui change dès que les joueurs bougent un peu (12/11 :
    // une seule graine rendait le test fragile).
    let ecart = 0;
    for (let g = 1; g <= 6; g++) {
      const m = nouveauMatch(g);
      m.demarrer();
      m.definirMode("nous");
      m.avancer(15);
      const enAttaque = moyenneY(m);
      m.definirMode("eux");
      m.avancer(15);
      ecart += (enAttaque - moyenneY(m)) / 6;
    }
    // Perdu haut, le ballon est encore loin de notre but : le bloc défend
    // haut (bloc médian) et ne redescend donc pas jusqu'à sa surface.
    expect(ecart).toBeGreaterThan(8);
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
    // Placé une rangée plus haut (6 m sur le plateau), il joue en attaque au
    // moins 4 m devant les deux autres : l'écart du plateau est gardé, à
    // l'échelle d'une équipe plus courte depuis le 12/11 (défense 15 m
    // derrière le ballon au lieu de 20).
    expect(y("lomont") - (y("belcourt") + y("kessai")) / 2).toBeGreaterThan(4);
  });
});

// Contrôles tirés de docs/reference-football.md (§9.4) : le moteur ne doit pas
// s'éloigner du football. Mesurés en défense organisée, après le repli.
describe.each(PLATEAUX)("réalisme (référence football), plateau %s", (plateauId) => {
  const donnees = chargerDonnees(plateauId);
  const nouveauMatch = (graine = 42, effectif?: Equipe): MatchSim => {
    const { effectif: e, adversaire } = chargerEquipes(donnees);
    return new MatchSim(donnees, reglages, [effectif ?? e, adversaire], graine);
  };
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
    const { effectif } = chargerEquipes(donnees);
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
    const { effectif } = chargerEquipes(donnees);
    const r = placer(effectif.composition, donnees, "ferrand", "DG", 2);
    if (!r.ok) throw new Error(r.erreur);
    const m = nouveauMatch(1, { ...effectif, composition: r.composition });
    m.demarrer();
    m.definirMode("nous");
    m.avancer(14);
    const dg = m.joueurs.find((j) => j.joueur.id === "ferrand")!;
    const dcs = m.joueurs.filter((j) => j.camp === 0 && j.poste.id === "DC");
    // Placé haut, le latéral est à hauteur du milieu défensif sur le
    // plateau : en attaque, il joue au moins 10 m devant ses défenseurs centraux.
    expect(dg.pos.y - moyenneY(dcs)).toBeGreaterThan(10);
  });

  test("le bloc coulisse : ballon à gauche, centre du bloc à gauche ; ballon à droite, à droite", () => {
    const { effectif } = chargerEquipes(donnees);
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
    // Un défenseur peut être en retard quand le ballon repart vite en arrière
    // (la ligne doit remonter) : c'est du football. Mais jamais repoussé par
    // nos attaquants, et jamais en retard plus de 4 s d'affilée (remonter
    // 20 m à 7 m/s au plus, accélération comprise, prend environ 3,5 s).
    for (const graine of [1, 2, 3, 4]) {
      const m = nouveauMatch(graine);
      m.demarrer();
      m.definirMode("nous");
      const historique: number[] = [];
      let n = 0;
      let repoussee = 0;
      let duree = 0;
      let dureeMax = 0;
      for (let t = 0; t < 60; t += 0.25) {
        m.avancer(0.25);
        historique.push(yRepere(m, 1, m.ballon));
        if (t < 8 || m.enTransition) continue;
        n++;
        const ecart = Math.max(
          ...m.joueurs.filter((j) => j.camp === 1 && j.poste.ligneDefense === "defense").map((j) => yRepere(m, 1, j.cible) - yRepere(m, 1, j.pos)),
        );
        // Ballon reparti vers leur but (vers le haut de leur repère) dans les 2 dernières secondes ?
        const ballonRecule = historique[historique.length - 1]! - historique[Math.max(0, historique.length - 9)]! > 5;
        duree = ecart > 5 ? duree + 0.25 : 0;
        dureeMax = Math.max(dureeMax, duree);
        if (ecart > 5 && !ballonRecule) repoussee++;
      }
      expect(repoussee / n).toBeLessThan(0.05);
      expect(dureeMax).toBeLessThanOrEqual(4);
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

  // ---- Transitions (ajoutés le 12/11 après le retour du concepteur : à la
  // récupération vers 40 m du but adverse, défense adverse restée vers 19 m
  // de son but, loin de tout, milieux et attaquants 15 à 20 m plus haut, nos
  // attaquants qui ne venaient pas jusqu'à sa ligne). Référence football §1
  // (une transition dure 5 à 8 s), §3 (compacité) et §9.3. Mesurés sur toutes
  // les récupérations de matchs en ballon alterné, plusieurs graines.

  interface InstantTransition {
    m: MatchSim;
    /** Secondes depuis le changement de possession. */
    dt: number;
    /** Équipe qui vient de récupérer le ballon, équipe qui vient de le perdre. */
    A: 0 | 1;
    D: 0 | 1;
    /** Distance du ballon au but adverse au moment de la récupération (m). */
    recupAuButM: number;
  }
  function transitions(mesurer: (x: InstantTransition) => void) {
    for (const graine of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const m = nouveauMatch(graine);
      m.demarrer();
      m.definirMode("auto");
      let possession = m.possession;
      let debut = -1;
      let recupAuButM = 0;
      for (let k = 0; k < 120 / reglages.pasDeTempsS; k++) {
        m.pas();
        if (m.possession !== possession) {
          possession = m.possession;
          debut = m.temps > 6 ? m.temps : -1; // pas le coup d'envoi
          recupAuButM = L - yRepere(m, possession, m.ballon);
        }
        if (debut < 0 || k % 6 !== 0) continue; // un relevé toutes les 0,2 s
        const dt = m.temps - debut;
        if (dt > 6) {
          debut = -1;
          continue;
        }
        mesurer({ m, dt, A: possession, D: possession === 0 ? 1 : 0, recupAuButM });
      }
    }
  }
  const champ = (m: MatchSim, camp: 0 | 1) => m.joueurs.filter((j) => j.camp === camp && j.poste.id !== "G");
  const longueur = (m: MatchSim, camp: 0 | 1) => {
    const ys = champ(m, camp).map((j) => yRepere(m, camp, j.pos));
    return Math.max(...ys) - Math.min(...ys);
  };
  const hauteurMoyenne = (m: MatchSim, camp: 0 | 1, garder: (j: MatchSim["joueurs"][number]) => boolean) => {
    const js = m.joueurs.filter((j) => j.camp === camp && garder(j));
    return js.reduce((s, j) => s + yRepere(m, camp, j.pos), 0) / js.length;
  };
  const part = (v: number[], ok: (x: number) => boolean) => v.filter(ok).length / v.length;
  const mediane = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]!;

  test("transition défensive : l'équipe qui perd le ballon reste groupée et s'organise en 5 s", () => {
    const longueurs: number[] = [];
    const ecartsTard: number[] = [];
    const longueursTard: number[] = [];
    transitions(({ m, dt, D }) => {
      longueurs.push(longueur(m, D));
      if (dt < 5) return;
      const def = hauteurMoyenne(m, D, (j) => j.poste.ligneDefense === "defense");
      ecartsTard.push(hauteurMoyenne(m, D, (j) => j.poste.ligneDefense === "milieu") - def);
      longueursTard.push(longueur(m, D));
    });
    expect(part(longueurs, (x) => x <= 50)).toBeGreaterThan(0.95);
    // Après 5 s, défense organisée : 8 à 16 m entre défense et milieu, 40 m au plus de long.
    expect(part(ecartsTard, (x) => x >= 8 && x <= 16)).toBeGreaterThan(0.9);
    expect(part(longueursTard, (x) => x <= 40)).toBeGreaterThan(0.95);
  });

  test("transition défensive : la ligne recule pas à pas, sans lâcher son milieu", () => {
    // Avant le 12/11 : la ligne filait tout de suite 22 m derrière le ballon,
    // les milieux axiaux restaient plus de 20 m devant elle 17 % du temps.
    const l = reglages.projection.defense.ligneDefensive;
    const dt = reglages.pasDeTempsS;
    for (const graine of [1, 2, 3]) {
      const m = nouveauMatch(graine);
      m.demarrer();
      m.definirMode("auto");
      let avant = [...m.lignesDef];
      for (let k = 0; k < 60 / dt; k++) {
        m.pas();
        for (const camp of [0, 1] as const) {
          const a = avant[camp];
          const b = m.lignesDef[camp];
          if (a === null || a === undefined || b === null) continue;
          expect(a - b).toBeLessThanOrEqual(Math.max(l.vitesseReculMS, l.vitesseReculDangerMS) * dt + 1e-9); // recul rapide si le ballon arrive sur la ligne
          expect(b - a).toBeLessThanOrEqual(l.vitesseMonteeMS * dt + 1e-9);
        }
        avant = [...m.lignesDef];
      }
    }
    const milieuxAxe: number[] = [];
    const ballonDefense: number[] = [];
    transitions(({ m, D }) => {
      const def = hauteurMoyenne(m, D, (j) => j.poste.ligneDefense === "defense");
      milieuxAxe.push(hauteurMoyenne(m, D, (j) => j.poste.id === "MC") - def);
      ballonDefense.push(yRepere(m, D, m.ballon) - def);
    });
    expect(part(milieuxAxe, (x) => x <= 20)).toBeGreaterThan(0.9);
    // La défense n'est pas « loin de tout » (avant : 23 à 24 m du ballon en médiane).
    expect(mediane(ballonDefense)).toBeLessThanOrEqual(21);
  });

  test("transition offensive : récupération à 30-50 m du but adverse, nos attaquants vont jusqu'à sa ligne", () => {
    // Écart entre notre joueur le plus avancé et le dernier défenseur adverse
    // (négatif : en deçà). Avant le 12/11 : −8 à −9 m en médiane après 3 s.
    const a3: number[] = [];
    const tard: number[] = [];
    transitions(({ m, dt, A, D, recupAuButM }) => {
      if (recupAuButM < 30 || recupAuButM > 50) return;
      const devant = Math.max(...champ(m, A).map((j) => yRepere(m, A, j.pos)));
      const dernier = L - Math.min(...champ(m, D).map((j) => yRepere(m, D, j.pos)));
      if (dt >= 3 && dt < 3.5) a3.push(devant - dernier);
      if (dt >= 4.5) tard.push(devant - dernier);
    });
    expect(a3.length).toBeGreaterThan(30);
    expect(mediane(a3)).toBeGreaterThan(-7);
    expect(part(tard, (x) => x >= -6)).toBeGreaterThan(0.9);
  });

  test("transition offensive : le bloc qui récupère monte ensemble", () => {
    const longueurs: number[] = [];
    transitions(({ m, A }) => longueurs.push(longueur(m, A)));
    expect(part(longueurs, (x) => x <= 50)).toBeGreaterThan(0.95);
  });
});
