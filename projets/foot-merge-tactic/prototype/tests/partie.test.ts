import { describe, expect, test } from "bun:test";
import { CATALOGUE, Partie, REGLES, Reserve } from "../src/jeu/partie";
import { chargerDonnees, chargerEquipes, chargerReglages } from "../src/sim/chargement";
import { Aleatoire } from "../src/sim/rng";
import { MatchSim } from "../src/sim/simulation";

const donnees = chargerDonnees("hexagones");
const { adversaire } = chargerEquipes(donnees);
const plan = [...adversaire.composition.filter((p) => p.poste !== "G"), ...adversaire.composition.filter((p) => p.poste === "G")].map((p) => ({ poste: p.poste, cellule: p.cellule }));

/** Draft d'un camp « joueur » qui suit la même formation et prend la carte la moins chère proposée. */
function drafterJoueur(p: Partie): void {
  for (const s of plan) {
    expect(p.casePermise(0, s.poste, s.cellule)).toBe(true);
    const offre = p.offre(0, s.poste);
    const id = [...offre].sort((a, b) => p.carte(a).prix - p.carte(b).prix)[0]!;
    const r = p.choisir(0, s.poste, s.cellule, id);
    expect(r.ok).toBe(true);
    p.ordiChoisir();
  }
}

describe("Partie contre l'ordinateur (13/11)", () => {
  test("catalogue : 60 cartes, 12 par pays, un style de chaque par pays, jamais le gardien", () => {
    expect(CATALOGUE.cartes.length).toBe(60);
    for (const pays of Object.keys(CATALOGUE.pays)) {
      const c = CATALOGUE.cartes.filter((x) => x.pays === pays);
      expect(c.length).toBe(12);
      expect(c.filter((x) => x.poste === "G").length).toBe(1);
      expect(c.filter((x) => x.style).map((x) => x.style).sort()).toEqual(["RAP", "REC", "REM", "TEC"]);
    }
    expect(CATALOGUE.cartes.every((c) => c.poste !== "G" || !c.style)).toBe(true);
  });

  test("réserve : tirage sans doublon, jamais une carte épuisée", () => {
    const cartes = CATALOGUE.cartes.slice(0, 6);
    const r = new Reserve(cartes);
    const rng = new Aleatoire(3);
    const id = cartes[0]!.id;
    for (let i = 0; i < cartes[0]!.copies; i++) r.prendre(id);
    for (let k = 0; k < 50; k++) {
      const t = r.tirer(rng, 4);
      expect(new Set(t).size).toBe(t.length);
      expect(t).not.toContain(id);
    }
    expect(() => r.prendre(id)).toThrow();
  });

  test("draft : 11 titulaires de chaque côté, budget respecté, gardien compris, copies prises dans la réserve", () => {
    for (let g = 1; g <= 20; g++) {
      const p = new Partie(donnees, g, plan);
      drafterJoueur(p);
      while (!p.draftFini(1) && p.ordiChoisir());
      for (const camp of [0, 1] as const) {
        const c = p.camps[camp];
        expect(c.composition.length).toBe(11);
        expect(c.composition.filter((x) => x.poste === "G").length).toBe(1);
        expect(c.budget).toBeGreaterThanOrEqual(0);
        const depense = c.effectif.reduce((s, m) => s + p.carte(m.id).prix, 0);
        expect(depense + c.budget).toBe(REGLES.budgetDepart);
      }
      const pris = [...p.camps[0].effectif, ...p.camps[1].effectif];
      for (const k of CATALOGUE.cartes) expect(p.reserve.reste(k.id)).toBe(k.copies - pris.filter((m) => m.id === k.id).length);
    }
  });

  test("le dernier choix est le gardien s'il manque ; une carte trop chère est refusée", () => {
    const p = new Partie(donnees, 5, plan);
    const champ = plan.filter((s) => s.poste !== "G");
    for (const s of champ) {
      const id = [...p.offre(0, s.poste)].sort((a, b) => p.carte(a).prix - p.carte(b).prix)[0]!;
      expect(p.choisir(0, s.poste, s.cellule, id).ok).toBe(true);
    }
    expect(p.casePermise(0, "DC", 1)).toBe(false);
    expect(p.casePermise(0, "G", 0)).toBe(true);
    const g = p.offre(0, "G");
    const cher = g.find((id) => p.carte(id).prix > p.camps[0].budget);
    if (cher) expect(p.choisir(0, "G", 0, cher).ok).toBe(false);
    expect(g.some((id) => p.carte(id).prix <= p.camps[0].budget)).toBe(true);
  });

  test("mercato de l'ordinateur : banc de 5 au plus, budget jamais négatif, copies fusionnées", () => {
    for (let g = 1; g <= 20; g++) {
      const p = new Partie(donnees, 100 + g, plan);
      drafterJoueur(p);
      p.ordiMercato(5, 3);
      const c = p.camps[1];
      expect(c.effectif.length - c.composition.length).toBeLessThanOrEqual(5);
      expect(c.budget).toBeGreaterThanOrEqual(0);
      expect(new Set(c.effectif.map((m) => m.id)).size).toBe(c.effectif.length);
      expect(c.effectif.every((m) => m.fusions <= 3)).toBe(true);
    }
  });

  test("fusion (14/11) : les notes de la carte ne changent pas ; l'équipe porte le pays et le niveau de fusion", () => {
    const p = new Partie(donnees, 5, plan);
    while (!p.draftFini(0)) {
      p.ordiChoisir(0);
      p.ordisChoisissent();
    }
    const m = p.camps[0]!.effectif[0]!;
    m.fusions = 2;
    const j = p.equipeDe(0).joueurs.find((x) => x.id === m.id)!;
    const carte = CATALOGUE.cartes.find((c) => c.id === m.id)!;
    expect(j.notes).toEqual(carte.notes);
    expect(j.fusions).toBe(2);
    expect(j.pays).toBe(carte.pays);
  });

  test("offre du draft : une vedette (4-5 pièces) quand le poste en a une", () => {
    for (let graine = 1; graine <= 10; graine++) {
      const p = new Partie(donnees, graine, plan);
      for (const poste of ["DC", "MC", "AC"]) expect(p.offre(0, poste).some((id) => p.carte(id).prix >= 4)).toBe(true);
    }
  });

  test("les deux équipes draftées jouent un match", () => {
    const p = new Partie(donnees, 9, plan);
    drafterJoueur(p);
    p.ordiMercato(5, 3);
    const nous = { nom: "Toi", nationalite: "Toi", joueurs: p.camps[0].effectif.map((m) => ({ id: m.id, nom: p.carte(m.id).nom, postes: [p.carte(m.id).poste], style: p.carte(m.id).style, notes: p.carte(m.id).notes })), composition: p.camps[0].composition, tactique: "EQU" };
    const sim = new MatchSim(donnees, chargerReglages(), [nous, p.equipeOrdi()], 1, true);
    sim.demarrer();
    sim.avancer(30);
    expect(sim.joueurs.length).toBe(22);
    expect(sim.joueurs.every((j) => Number.isFinite(j.pos.x) && Number.isFinite(j.pos.y))).toBe(true);
  });

  test("14/11 : l'ordinateur fait jouer ses fusionnés (aucun remplaçant plus fort qu'un titulaire du même poste)", () => {
    let fusionnesTitulaires = 0;
    for (let g = 1; g <= 30; g++) {
      const p = new Partie(donnees, 300 + g, plan);
      p.finirDraftOrdis(5, 3);
      for (let j = 0; j < 3; j++) {
        if (j > 0) p.nouvelleJournee(5, 3);
        for (let camp = 1; camp < p.camps.length; camp++) {
          const c = p.camps[camp]!;
          expect(c.composition.length).toBe(11);
          const force = (id: string) => p.valeur(id) + REGLES.ordi.valeurFusion * c.effectif.find((m) => m.id === id)!.fusions;
          for (const m of c.effectif) {
            if (c.composition.some((x) => x.joueurId === m.id)) continue;
            for (const t of c.composition) if (t.poste === p.carte(m.id).poste) expect(force(m.id)).toBeLessThanOrEqual(force(t.joueurId));
          }
          fusionnesTitulaires += c.effectif.filter((m) => m.fusions > 0 && c.composition.some((x) => x.joueurId === m.id)).length;
        }
      }
    }
    expect(fusionnesTitulaires).toBeGreaterThan(0);
  });

  test("14/11 : équipe auto haute qualité et moyenne (budget, 11 titulaires à leur poste, banc, qualité)", () => {
    let haute = 0;
    let moyenne = 0;
    const equipes = new Set<string>();
    for (let g = 1; g <= 6; g++) {
      for (const q of ["haute", "moyenne"] as const) {
        const p = new Partie(donnees, 500 + g, plan);
        const b = p.equipeAuto(0, q, 5, 3);
        const c = p.camps[0]!;
        expect(c.composition.length).toBe(11);
        expect(c.budget).toBeGreaterThanOrEqual(0);
        expect(b.depense + c.budget).toBe(REGLES.budgetDepart);
        expect(b.banc).toBe(REGLES.auto.bancMin);
        for (const pl of c.composition) expect(p.carte(pl.joueurId).poste).toBe(pl.poste);
        const depense = c.effectif.reduce((s, m) => s + p.carte(m.id).prix * (1 + m.fusions), 0);
        expect(depense).toBe(b.depense);
        if (q === "haute") {
          haute += b.moyenne;
          equipes.add(c.composition.map((x) => x.joueurId).sort().join());
        } else {
          moyenne += b.moyenne;
          expect(b.fusions).toBe(0);
        }
        // Les ordinateurs finissent leur draft après.
        p.finirDraftOrdis(5, 3);
        for (let k = 1; k < p.camps.length; k++) expect(p.camps[k]!.composition.length).toBe(11);
      }
    }
    // Haute qualité : bien au-dessus ; moyenne : « pas nul, moyenne » (cartes à 2 ou 3 pièces : 64 à 71).
    expect(haute / 6).toBeGreaterThan(74);
    expect(moyenne / 6).toBeGreaterThan(63);
    expect(moyenne / 6).toBeLessThan(70);
    expect(equipes.size).toBeGreaterThan(1); // plusieurs cas
  });
});
